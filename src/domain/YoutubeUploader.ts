import { Subject } from 'rxjs';
import Youtube, {
  PrivacyStatus,
  Snippet,
} from '../infrastructure/Youtube';
import SequentialWorker from './SequentialWorker';

export default class YoutubeUploader {
  private readonly sequentialWorker = new SequentialWorker();

  readonly authenticationRequired = new Subject();
  readonly progressUpdated = new Subject<{ niconicoVideoId: string; progress: number; }>();
  readonly uploaded = new Subject<{
    niconicoVideoId: string;
    youtubeVideoId: string;
    snippet: Snippet;
  }>();
  readonly error = new Subject<Error & { niconicoVideoId: string; }>();

  constructor(
    private readonly youtube: Youtube,
    private readonly privacyStatus: PrivacyStatus,
  ) {
    this.sequentialWorker.error.subscribe((e) => {
      (<any>e).niconicoVideoId = e.label;
      this.error.next(<any>e);
    });
  }

  ready() {
    this.sequentialWorker.ready();
  }

  enqueue(niconicoVideoId: string, filePath: string, thumbnailFilePath: string, snippet: Snippet) {
    this.sequentialWorker.enqueue(
      niconicoVideoId,
      // tslint:disable-next-line:promise-function-async promise-must-complete
      async () => {
        const videoId = await this.youtube.uploadVideo(
          filePath,
          thumbnailFilePath,
          snippet,
          this.privacyStatus,
          {
            progress: (progress: number) => {
              this.progressUpdated.next({ niconicoVideoId, progress });
            },
          },
        );
        this.uploaded.next({ niconicoVideoId, snippet, youtubeVideoId: videoId });
      },
    );
  }
}
