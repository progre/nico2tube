// tslint:disable-next-line:no-implicit-dependencies
import { PowerSaveBlocker } from 'electron';
import { Subject } from 'rxjs';
import ConfigurationRepo from '../infrastructure/ConfigurationRepo';
import Niconico from '../infrastructure/Niconico';
import Configuration from './Configuration';
import NiconicoVideo, { parseAPIData, toVideoId } from './NiconicoVideo';
import SequentialWorker from './SequentialWorker';
import { ApplicationError } from './types';

export default class NiconicoDownloader {
  private readonly sequentialWorker = new SequentialWorker();
  private powerSaveId: number | null = null;

  readonly error: Subject<ApplicationError> = this.sequentialWorker.error;
  readonly progressUpdated = new Subject<{ videoId: string; progress: number; }>();
  readonly downloaded = new Subject<{
    videoId: string;
    niconicoVideo: NiconicoVideo;
    videoPath: string;
    thumbnailPath: string;
  }>();

  constructor(
    private configurationRepo: ConfigurationRepo,
    private niconico: Niconico,
    private powerSaveBlocker: PowerSaveBlocker,
  ) {
  }

  enqueue(url: string) {
    const videoId = toVideoId(url);
    if (videoId == null) {
      this.error.next(new Error(`Invalid url: ${url}`));
      return;
    }
    if (this.powerSaveId == null) {
      this.startPowerSaving();
    }
    this.sequentialWorker.enqueue(videoId, async () => this.task(videoId));
  }

  ready() {
    this.sequentialWorker.ready();
  }

  private async task(videoId: string) {
    const watchHTML = await this.niconico.getWatchHTML(videoId);
    const apiData = parseAPIData(watchHTML);
    if (apiData == null) {
      throw new Error('Niconico movie maker isn\'t supported'); // TODO: 諦めるケース
    }
    const conf = await this.configurationRepo.get();

    const videoPath = await this.downloadVideo(videoId, apiData, conf);
    const niconicoVideo = await this.downloadMeta(videoId, apiData);
    const thumbnailPath = await this.niconico.downloadThumbnail(
      videoId,
      niconicoVideo.thumbnailURL,
      conf.workingFolderPath,
    );
    // 特にロールバックはなし

    if (this.sequentialWorker.length() <= 1) { // 今処理しているのが最後なら止める
      this.stopPowerSaving();
    }
    this.downloaded.next({ videoId, niconicoVideo, videoPath, thumbnailPath });
  }

  private async downloadVideo(videoId: string, apiData: any, conf: Configuration) {
    // TODO: ログイン不要になったはず
    const sessionCookie = await this.niconico.createSessionCookie(
      conf.niconicoEmail,
      conf.niconicoPassword,
    );
    if (sessionCookie == null) {
      throw new Error('logging in failed');
    }
    const filePath = `${conf.workingFolderPath}/${videoId}`;
    await this.niconico.download(
      sessionCookie,
      videoId,
      getURLFromAPIData(apiData),
      filePath,
      {
        progress: (progress: number) => {
          this.progressUpdated.next({ videoId, progress });
        },
      },
    );
    return filePath;
  }

  private async downloadMeta(videoId: string, apiData: any) {
    const getThimbInfoXML = await this.niconico.getGetThumbInfo(videoId);
    return NiconicoVideo.fromGetThumbInfoXMLAndAPIData(
      getThimbInfoXML,
      apiData,
    );
  }

  private startPowerSaving() {
    this.powerSaveId = this.powerSaveBlocker.start('prevent-app-suspension');
  }

  private stopPowerSaving() {
    if (this.powerSaveId == null) {
      throw new Error('logic error');
    }
    this.powerSaveBlocker.stop(this.powerSaveId);
    this.powerSaveId = null;
  }

  // @ts-ignore
  private async getURLFromAPI(
    configuration: Configuration,
    sessionCookie: string,
    videoId: string,
  ) {
    const status = await this.niconico.getGetFlv(sessionCookie, videoId);
    if (status == null) {
      throw new Error('getting getflv failed');
    }
    if (status.isNm) {
      throw new Error('Niconico movie maker isn\'t supported');
    }
    if (configuration.niconicoNoEconomy && status.isEconomy) {
      throw new Error('economy');
    }
    return status.url;
  }
}

function getURLFromAPIData(apiData: any) {
  const url: string = apiData.video.smileInfo.url;
  if (url.endsWith('low')) {
    throw new Error('economy');
  }
  return url;
}
