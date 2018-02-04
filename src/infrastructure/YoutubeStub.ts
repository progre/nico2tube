import { Observable } from 'rxjs';
import { PrivacyStatus, Snippet } from './Youtube';

export default class YoutubeStub {
  async authenticate() {
    process.stdout.write('authenticate\n');
  }

  upload(
    _: string,
    __: string,
    ___: Snippet,
    ____: PrivacyStatus,
  ) {
    process.stdout.write('upload\n');
    return new Observable((subscriber) => {
      subscriber.complete();
    });
  }
}
