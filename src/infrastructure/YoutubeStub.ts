import { Observable } from 'rxjs';
import { PrivacyStatus, Snippet } from './Youtube';

export default class YoutubeStub {
  async authenticate() {
    process.stdout.write('authenticate\n');
  }

  upload(
    filePath: string,
    thumbnailFilePath: string,
    snippet: Snippet,
    privacyStatus: PrivacyStatus,
  ) {
    process.stdout.write('upload\n');
    return new Observable((subscriber) => {
      subscriber.complete();
    });
  }
}
