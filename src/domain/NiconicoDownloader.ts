// tslint:disable-next-line:no-implicit-dependencies
import { PowerSaveBlocker } from 'electron';
import { Subject } from 'rxjs';
import ConfigurationRepo from '../infrastructure/ConfigurationRepo';
import Niconico from '../infrastructure/Niconico';
import { toVideoId } from './NiconicoVideo';
import SequentialWorker from './SequentialWorker';

export default class NiconicoDownloader {
  private readonly sequentialWorker = new SequentialWorker();
  private powerSaveId: number | null = null;

  readonly error = this.sequentialWorker.error;
  readonly progressUpdated = new Subject<{ videoId: string; progress: number; }>();
  readonly downloaded = new Subject<{ videoId: string; filePath: string; }>();

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
    const configuration = await this.configurationRepo.get();
    const sessionCookie = await this.niconico.createSessionCookie(
      configuration.niconicoEmail,
      configuration.niconicoPassword,
    );
    if (sessionCookie == null) {
      throw new Error('logging in failed');
    }
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
    const filePath = `${configuration.workingFolderPath}/${videoId}`;
    await this.niconico.download(
      sessionCookie,
      videoId,
      status.url,
      filePath,
      {
        progress: (progress: number) => {
          this.progressUpdated.next({ videoId, progress });
        },
      },
    );
    if (this.sequentialWorker.length() <= 1) { // 今処理しているのが最後なら止める
      this.stopPowerSaving();
    }
    this.downloaded.next({ filePath, videoId });
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
}
