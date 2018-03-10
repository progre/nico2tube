import cron from 'cron';
// tslint:disable-next-line:no-implicit-dependencies
import electron, { powerSaveBlocker } from 'electron';
import { Subject } from 'rxjs';
import MutablePlaylist from '../domain/MutablePlaylist';
import NiconicoDownloader from '../domain/NiconicoDownloader';
import NiconicoMylist, { parseMylistURL } from '../domain/NiconicoMylist';
import NiconicoVideo from '../domain/NiconicoVideo';
import PlaylistMaker from '../domain/PlaylistMaker';
import { ApplicationError } from '../domain/types';
import YoutubeUploader from '../domain/YoutubeUploader';
import ConfigurationRepo from '../infrastructure/ConfigurationRepo';
import Niconico from '../infrastructure/Niconico';
import NiconicoStub from '../infrastructure/NiconicoStub';
import Youtube, { PrivacyStatus, Snippet } from '../infrastructure/Youtube';
import YoutubeStub from '../infrastructure/YoutubeStub';

export default class TransferTaskWorker {
  private readonly configurationRepo: ConfigurationRepo;
  private readonly niconico: Niconico;
  private readonly youtube: Youtube;
  private readonly privacyStatus = 'public';
  private readonly niconicoDownloader: NiconicoDownloader;
  private readonly youtubeUploader: YoutubeUploader;
  private readonly playlistMaker: PlaylistMaker;
  private readonly playlists: MutablePlaylist[] = [];

  message = new Subject<string>();
  error = new Subject<ApplicationError>();

  constructor(dryRun: boolean, webContents: electron.WebContents) {
    this.niconico = dryRun ? new NiconicoStub() : new Niconico();
    this.youtube = dryRun ? <Youtube>new YoutubeStub() : new Youtube();
    this.configurationRepo = new ConfigurationRepo(webContents);

    this.niconicoDownloader = this.initDownloader(
      this.configurationRepo,
      this.niconico,
    );
    this.youtubeUploader = this.initUploader(this.youtube, this.privacyStatus);
    this.playlistMaker = this.initPlaylistMaker(this.youtube, this.privacyStatus);

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
    downloader.error.subscribe((e) => {
      if (e.message === 'economy') {
        this.message.next('低画質モードのため中止しました。2:05に再開します。');
        return;
      }
      this.error.next(e);
    });
    downloader.progressUpdated.subscribe(({ videoId, progress }) => {
      this.message.next(`${videoId} ダウンロード中: ${Math.floor(progress * 100)}%`);
    });
    downloader.downloaded.subscribe(({ videoId, niconicoVideo, videoPath, thumbnailPath }) => {
      this.afterDownload(videoId, niconicoVideo, videoPath, thumbnailPath);
    });
    return downloader;
  }

  private initUploader(youtube: Youtube, privacyStatus: PrivacyStatus) {
    const uploader = new YoutubeUploader(youtube, privacyStatus);
    uploader.error.subscribe(this.error);
    uploader.progressUpdated.subscribe(({ niconicoVideoId, progress }) => {
      this.message.next(`${niconicoVideoId} アップロード中: ${Math.floor(progress * 100)}%`);
    });
    uploader.uploaded.subscribe(async ({ niconicoVideoId, youtubeVideoId, snippet }) => {
      this.afterUpload(niconicoVideoId, youtubeVideoId, snippet);
    });
    return uploader;
  }

  private initPlaylistMaker(youtube: Youtube, privacyStatus: PrivacyStatus) {
    const playlistMaker = new PlaylistMaker(youtube, privacyStatus);
    playlistMaker.error.subscribe(this.error);
    playlistMaker.created.subscribe(({ niconicoMylistId }) => {
      this.afterPlaylistCreated(niconicoMylistId);
    });
    return playlistMaker;
  }

  async authenticate() {
    await this.youtube.authenticate();
    this.youtubeUploader.ready();
  }

  async retry() {
    this.niconicoDownloader.ready();
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
    this.playlists.push(MutablePlaylist.fromMylist(mylist));
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

  private afterDownload(
    videoId: string,
    niconicoVideo: NiconicoVideo,
    videoPath: string,
    thumbnailPath: string,
  ) {
    this.message.next(`${videoId} ダウンロード完了`);
    this.youtubeUploader.enqueue(
      videoId,
      videoPath,
      thumbnailPath,
      niconicoVideo.toSnippet(),
    );
  }

  private afterUpload(niconicoVideoId: string, youtubeVideoId: string, snippet: Snippet) {
    this.message.next(`${niconicoVideoId} アップロード完了`);
    this.updatePlaylist(niconicoVideoId, youtubeVideoId, snippet);

    const completedPlaylists = this.playlists
      .filter(x => x.items.every(y => y.videoId != null));
    for (const playlist of completedPlaylists) {
      this.message.next(`mylist/${playlist.niconicoMylistId} プレイリスト作成`);
      this.playlistMaker.enqueue(playlist);
    }
  }

  private afterPlaylistCreated(niconicoMylistId: string) {
    const idx = this.playlists.findIndex(x => x.niconicoMylistId === niconicoMylistId);
    if (idx < 0) {
      throw new Error('logic error');
    }
    this.playlists.splice(idx, 1);
    this.message.next(`mylist/${niconicoMylistId} プレイリスト作成完了`);
  }

  private updatePlaylist(niconicoVideoId: string, youtubeVideoId: string, snippet: Snippet) {
    for (const playlist of this.playlists) {
      playlist.setYoutubeVideoToItem(niconicoVideoId, youtubeVideoId, snippet);
    }
  }

  private requestAfterEconomyTime() {
    const job = new cron.CronJob('0 5 2 * * *', () => {
      this.niconicoDownloader.ready();
    });
    job.start();
  }
}
