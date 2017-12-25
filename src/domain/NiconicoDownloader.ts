import { Subject } from 'rxjs';
import ConfigurationRepo from '../infrastructure/ConfigurationRepo';
import Niconico from '../infrastructure/Niconico';
import { toVideoId } from './NiconicoVideo';
import SequentialWorker from './SequentialWorker';

export default class NiconicoDownloader {
  private sequentialWorker = new SequentialWorker();

  error = this.sequentialWorker.error;
  downloaded = new Subject<{ videoId: string; filePath: string; }>();
  queueUpdated = new Subject<string>();

  constructor(
    private configurationRepo: ConfigurationRepo,
    private niconico: Niconico,
  ) {
  }

  queue() {
    return this.sequentialWorker.queue();
  }

  enqueue(url: string) {
    const videoId = toVideoId(url);
    if (videoId == null) {
      this.error.next(new Error(`Invalid url: ${url}`));
      return;
    }
    this.sequentialWorker.enqueue(videoId, async () => this.task(videoId));
    this.queueUpdated.next();
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
    await new Promise((resolve, reject) => {
      this.niconico.download(
        sessionCookie,
        videoId,
        status.url,
        filePath,
      ).subscribe(
        (progress) => {
          console.log(progress);
        },
        reject,
        resolve,
      );
    });
    this.downloaded.next({ filePath, videoId });
  }
}
