import cron from 'cron';
// tslint:disable-next-line:no-implicit-dependencies
import electron, { powerSaveBlocker } from 'electron';
import { Subject } from 'rxjs';
import NiconicoDownloader from '../domain/NiconicoDownloader';
import NiconicoMylist, { parseMylistURL } from '../domain/NiconicoMylist';
import NiconicoVideo, { createDescription } from '../domain/NiconicoVideo';
import YoutubeUploader from '../domain/YoutubeUploader';
import ConfigurationRepo from '../infrastructure/ConfigurationRepo';
import Niconico from '../infrastructure/Niconico';
import NiconicoStub from '../infrastructure/NiconicoStub';
import Youtube, { Playlist, PrivacyStatus } from '../infrastructure/Youtube';
import YoutubeStub from '../infrastructure/YoutubeStub';

export interface MutablePlaylist {
  niconicoMylistId: string;
  title: string;
  description: string;
  tags: string[];
  items: {
    niconicoVideoId: string;
    note: string;
    videoId?: string;
  }[];
}

export default class TransferTaskWorker {
  private readonly configurationRepo: ConfigurationRepo;
  private readonly niconico: Niconico;
  private readonly youtube: Youtube;
  private readonly privacyStatus = 'private';
  private readonly niconicoDownloader: NiconicoDownloader;
  private readonly youtubeUploader: YoutubeUploader;
  private readonly playlists: MutablePlaylist[] = [];

  message = new Subject<string>();
  error = new Subject<Error>();

  constructor(dryRun: boolean, webContents: electron.WebContents) {
    this.niconico = dryRun ? new NiconicoStub() : new Niconico();
    this.youtube = dryRun ? <Youtube>new YoutubeStub() : new Youtube();
    this.configurationRepo = new ConfigurationRepo(webContents);

    this.niconicoDownloader = this.initDownloader(
      this.configurationRepo,
      this.niconico,
    );
    this.youtubeUploader = this.initUploader(this.youtube, this.privacyStatus);

    this.requestAfterEconomyTime();
  }

  private initDownloader(
    configurationRepo: ConfigurationRepo,
    niconico: Niconico,
  ) {
    const downloader = new NiconicoDownloader(
      configurationRepo,
      niconico,
      powerSaveBlocker,
    );
    downloader.progressUpdated.subscribe(({ videoId, progress }) => {
      this.message.next(`${videoId} ダウンロード中: ${Math.floor(progress * 100)}%`);
    });
    downloader.downloaded.subscribe(async ({ videoId, filePath }) => {
      try {
        await this.afterDownload(videoId, filePath);
      } catch (e) {
        this.error.next(e);
      }
    });
    downloader.error.subscribe((e) => {
      if (e.message === 'economy') {
        this.message.next('低画質モードのため中止しました。2:05に再開します。');
      }
      this.error.next(e);
    });
    return downloader;
  }

  private initUploader(youtube: Youtube, privacyStatus: PrivacyStatus) {
    const uploader = new YoutubeUploader(youtube, privacyStatus);
    uploader.progressUpdated.subscribe(({ niconicoVideoId, progress }) => {
      this.message.next(`${niconicoVideoId} アップロード中: ${Math.floor(progress * 100)}%`);
    });
    uploader.uploaded.subscribe(async ({ niconicoVideoId, youtubeVideoId }) => {
      try {
        await this.afterUpload(niconicoVideoId, youtubeVideoId);
      } catch (e) {
        this.error.next(e);
      }
    });
    uploader.error.subscribe(this.error);
    return uploader;
  }

  async authenticate() {
    await this.youtube.authenticate();
    this.youtubeUploader.ready();
  }

  enqueue(niconicoURL: string) {
    const isPlaylist = niconicoURL.includes('mylist');
    if (isPlaylist) {
      this.enqueueMylist(niconicoURL).catch((e) => { console.error(e.stack || e); });
    } else {
      this.enqueueVideo(niconicoURL);
    }
  }

  private async enqueueMylist(niconicoURL: string) {
    const mylistId = parseMylistURL(niconicoURL);
    const mylist = await this.fetchMylist(mylistId);
    this.playlists.push(toPlaylist(mylist));
    mylist.items.forEach((x) => {
      this.niconicoDownloader.enqueue(`http://www.nicovideo.jp/watch/${x.videoId}`);
    });
  }

  private async fetchMylist(mylistId: string) {
    const configuration = await this.configurationRepo.get();
    const sessionCookie = await this.niconico.createSessionCookie(
      configuration.niconicoEmail,
      configuration.niconicoPassword,
    );
    const src = await this.niconico.getMylist(sessionCookie, mylistId);
    return NiconicoMylist.fromAPIXML(mylistId, src);
  }

  private enqueueVideo(niconicoURL: string) {
    this.niconicoDownloader.enqueue(niconicoURL);
  }

  private async afterDownload(videoId: string, filePath: string) {
    this.message.next(`${videoId} ダウンロード完了`);
    const getThimbInfoXML = await this.niconico.getGetThumbInfo(videoId);
    const niconicoVideo = await NiconicoVideo.fromGetThumbInfoXML(
      getThimbInfoXML,
    );
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
    this.message.next(`${niconicoVideoId} アップロード完了`);
    for (const playlist of this.playlists) {
      const item = playlist.items.find(x => x.niconicoVideoId === niconicoVideoId);
      if (item == null) {
        continue;
      }
      item.videoId = youtubeVideoId;
    }
    const completedPlaylists = this.playlists
      .filter(x => x.items.every(y => y.videoId != null));
    for (const playlist of completedPlaylists) {
      const playlistId = await this.youtube.createPlaylist(
        <Playlist>playlist,
        this.privacyStatus,
      );
      const idx = this.playlists.indexOf(playlist);
      if (idx < 0) {
        throw new Error('logic error');
      }
      this.playlists.splice(idx, 1);
      this.message.next(`プレイリスト作成: ${playlist.title}`);
      for (const item of playlist.items) {
        const watchHTML = await this.niconico.getWatchHTML(item.niconicoVideoId);
        await this.youtube.updateVideoDescription(
          item.videoId!,
          createDescription(
            watchHTML,
            [
              {
                from: `mylist/${playlist.niconicoMylistId}`,
                to: `https://www.youtube.com/playlist?list=${playlistId}`,
              },
              ...playlist.items.map(x => ({
                from: x.niconicoVideoId,
                to: `https://www.youtube.com/watch?v=${x.videoId}`,
              })),
            ],
          ),
        );
      }
    }
  }

  private requestAfterEconomyTime() {
    const job = new cron.CronJob('0 5 2 * * *', () => {
      this.niconicoDownloader.ready();
    });
    job.start();
  }
}

function toPlaylist(mylist: NiconicoMylist): MutablePlaylist {
  return {
    niconicoMylistId: mylist.id,
    title: mylist.name,
    description: mylist.description,
    tags: [],
    items: mylist.items.map(x => ({
      niconicoVideoId: x.videoId,
      note: x.description,
    })),
  };
}
