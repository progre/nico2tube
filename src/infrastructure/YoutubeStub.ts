import { Playlist, PrivacyStatus, Snippet } from './Youtube';

export default class YoutubeStub {
  async authenticate() {
    process.stdout.write('authenticate\n');
  }

  async uploadVideo(
    filePath: string,
    thumbnailFilePath: string,
    snippet: Snippet,
    privacyStatus: PrivacyStatus,
    progressReceiver: { progress(progress: number): void; },
  ) {
    process.stdout.write('upload\n');
    return '';
  }

  async updateVideoDescription(videoId: string, description: string) {
    process.stdout.write('updateVideoDescription\n');
  }

  async createPlaylist(playlist: Playlist, privacyStatus: PrivacyStatus) {
    process.stdout.write('createPlaylist\n');
    return '';
  }
}
