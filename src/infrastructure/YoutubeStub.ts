import { Playlist, PrivacyStatus, Snippet } from './Youtube';

export default class YoutubeStub {
  async authenticate() {
    process.stdout.write('authenticate\n');
  }

  async uploadVideo(
    _: string,
    __: string,
    ___: Snippet,
    ____: PrivacyStatus,
    _____: { progress(progress: number): void; },
  ) {
    process.stdout.write('upload\n');
    return '';
  }

  async createPlaylist(_: Playlist, __: PrivacyStatus) {
    process.stdout.write('createPlaylist\n');
  }
}
