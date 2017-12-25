import { Subject } from 'rxjs';
import Youtube, {
  PrivacyStatus,
  Snippet,
} from '../infrastructure/Youtube';
import SequentialWorker from './SequentialWorker';

export default class YoutubeUploader {
  private readonly privacyStatus: PrivacyStatus = 'public';
  private readonly sequentialWorker = new SequentialWorker();

  authenticationRequired = new Subject();
  error = this.sequentialWorker.error;

  constructor(
    private youtube: Youtube,
  ) {
  }

  ready() {
    this.sequentialWorker.ready();
  }

  enqueue(filePath: string, thumbnailFilePath: string, snippet: Snippet) {
    this.sequentialWorker.enqueue(
      filePath,
      // tslint:disable-next-line:promise-function-async promise-must-complete
      () => new Promise((resolve, reject) => {
        this.youtube.upload(
          filePath,
          thumbnailFilePath,
          snippet,
          this.privacyStatus,
        ).subscribe(
          (progress) => {
            console.log(progress);
          },
          reject,
          resolve,
        );
      }),
    );
  }
}
