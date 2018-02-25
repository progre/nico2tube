import electron from 'electron';
import { Subject } from 'rxjs';
import NiconicoDownloader from '../domain/NiconicoDownloader';
import NiconicoMylist from '../domain/NiconicoMylist';
import NiconicoVideo from '../domain/NiconicoVideo';
import { Task, TaskQueue } from '../domain/types';
import YoutubeUploader from '../domain/YoutubeUploader';
import ConfigurationRepo from '../infrastructure/ConfigurationRepo';
import Niconico from '../infrastructure/Niconico';
import NiconicoStub from '../infrastructure/NiconicoStub';
import Youtube from '../infrastructure/Youtube';
import YoutubeStub from '../infrastructure/YoutubeStub';

export interface Playlist {
  name: string;
  description: string;
  items: {
    niconicoVideoId: string;
    description: string;
    youtubeVideoId?: string;
  }[];
}

export default class TransferTaskWorker {
  private readonly privacyStatus = 'private';
  private readonly configurationRepo: ConfigurationRepo;
  private readonly niconico: Niconico;
  private readonly niconicoDownloader: NiconicoDownloader;
  private readonly youtube: Youtube;
  private readonly youtubeUploader: YoutubeUploader;
  private readonly taskQueue: TaskQueue = [];
  private readonly playlists: Playlist[] = [];

  // taskQueueUpdated = new Subject<{ niconicoURL: string }>();
  error = new Subject<Error>();

  constructor(dryRun: boolean, webContents: electron.WebContents) {
    if (dryRun) {
      this.niconico = new NiconicoStub();
      this.youtube = <Youtube>new YoutubeStub();
    } else {
      this.niconico = new Niconico();
      this.youtube = new Youtube();
    }
    this.configurationRepo = new ConfigurationRepo(webContents);
    this.niconicoDownloader = new NiconicoDownloader(
      this.configurationRepo,
      this.niconico,
    );
    this.youtubeUploader = new YoutubeUploader(this.youtube, this.privacyStatus);

    this.niconicoDownloader.progressUpdated.subscribe(({ videoId, progress }) => {
      console.log(videoId, progress);
    });
    this.niconicoDownloader.downloaded.subscribe(async ({ videoId, filePath }) => {
      try {
        await this.afterDownload(videoId, filePath);
      } catch (e) {
        this.error.next(e);
      }
    });
    this.youtubeUploader.progressUpdated.subscribe(({ niconicoVideoId, progress }) => {
      console.log(niconicoVideoId, progress);
    });
    this.youtubeUploader.uploaded.subscribe(async ({ niconicoVideoId, youtubeVideoId }) => {
      try {
        await this.afterUpload(niconicoVideoId, youtubeVideoId);
      } catch (e) {
        this.error.next(e);
      }
    });
    this.niconicoDownloader.error.subscribe(this.error);
    this.youtubeUploader.error.subscribe(this.error);
  }

  async authenticate() {
    await this.youtube.authenticate();
    this.youtubeUploader.ready();
  }

  enqueue(niconicoURL: string) {
    const isPlaylist = niconicoURL.includes('mylist');
    this.taskQueue.push(<Task>{
      niconicoURL,
      type: isPlaylist ? 'playlist' : 'video',
    });
    // this.taskQueueUpdated.next({ niconicoURL });
    if (isPlaylist) {
      this.enqueueMylist(niconicoURL).catch((e) => { console.error(e.stack || e); });
    } else {
      this.enqueueVideo(niconicoURL);
    }
  }

  private async enqueueMylist(niconicoURL: string) {
    const m = /http:\/\/www\.nicovideo\.jp\/mylist\/(.+)/.exec(niconicoURL);
    if (m == null || m[1] == null || m[1].length < 1) {
      throw new Error('invalid url');
    }
    const mylistId = m[1];
    const mylist = await this.fetchMylist(mylistId);
    this.playlists.push({
      name: mylist.name,
      description: mylist.description,
      items: mylist.items.map(x => ({
        niconicoVideoId: x.videoId,
        description: x.description,
      })),
    });
    mylist.items.forEach((x) => {
      this.niconicoDownloader.enqueue(`http://www.nicovideo.jp/watch/${x.videoId}`);
    });
    // アップした動画のidを含めてプレイリストを作成
    // レジュームはサポートしない
  }

  private async fetchMylist(mylistId: string) {
    const configuration = await this.configurationRepo.get();
    const sessionCookie = await this.niconico.createSessionCookie(
      configuration.niconicoEmail,
      configuration.niconicoPassword,
    );
    const src = await this.niconico.getMylist(sessionCookie, mylistId);
    return NiconicoMylist.fromAPIXML(src);
  }

  private enqueueVideo(niconicoURL: string) {
    this.niconicoDownloader.enqueue(niconicoURL);
  }

  private async afterDownload(videoId: string, filePath: string) {
    const getThimbInfoXML = await this.niconico.getGetThumbInfo(videoId);
    const niconicoVideo = await NiconicoVideo.fromGetThumbInfoXML(getThimbInfoXML);
    const conf = await this.configurationRepo.get();
    const thumbnailFilePath = await this.niconico.downloadThumbnail(
      videoId,
      niconicoVideo.thumbnailURL,
      conf.workingFolderPath,
    );
    this.youtubeUploader.enqueue(
      videoId,
      filePath,
      thumbnailFilePath,
      niconicoVideo.toSnippet(),
    );
  }

  private async afterUpload(niconicoVideoId: string, youtubeVideoId: string) {
    for (const playlist of this.playlists) {
      const item = playlist.items.find(x => x.niconicoVideoId === niconicoVideoId);
      if (item == null) {
        continue;
      }
      item.youtubeVideoId = youtubeVideoId;
    }
    const completedPlaylists = this.playlists
      .filter(x => x.items.every(y => y.youtubeVideoId != null));
    for (const playlist of completedPlaylists) {
      await this.uploadPlaylist(playlist);
      const idx = this.playlists.indexOf(playlist);
      if (idx < 0) {
        throw new Error('logic error');
      }
      this.playlists.splice(idx, 1);
    }
  }

  async uploadPlaylist(playlist: Playlist) {
    await this.youtube.createPlaylist(
      {
        title: playlist.name,
        description: playlist.description,
        tags: [],
        items: playlist.items.map(x => ({
          videoId: x.youtubeVideoId || <any>(() => { throw new Error(); })(),
          note: x.description,
        })),
      },
      this.privacyStatus,
    );
  }
}
