import fs from 'fs';
import util from 'util';
import PromisifiedYoutubeAPI from './PromisifiedYoutubeAPI';

const statFile = util.promisify(fs.stat);

export type PrivacyStatus = 'public' | 'private' | 'unlisted';

export interface Snippet {
  title: string;
  description: string;
  tags: ReadonlyArray<string>;
  categoryId: number | null;
}

export interface Playlist {
  readonly title: string;
  readonly description: string;
  readonly tags: ReadonlyArray<string>;
  readonly items: ReadonlyArray<{
    videoId: string;
    note: string;
  }>;
}

export default class Youtube {
  private api = new PromisifiedYoutubeAPI();
  private authenticating = false;

  async authenticate() {
    if (this.authenticating) {
      return;
    }
    this.authenticating = true;
    try {
      await this.api.authenticate();
    } finally {
      this.authenticating = false;
    }
  }

  async uploadVideo(
    filePath: string,
    thumbnailFilePath: string,
    snippet: Snippet,
    privacyStatus: PrivacyStatus,
    progressReceiver: { progress(progress: number): void; },
  ) {
    const { size } = await statFile(filePath);
    await this.api.checkAuth();
    const { id } = await this.api.insertVideo(
      {
        part: 'snippet,status',
        resource: {
          snippet,
          status: { privacyStatus },
        },
        media: { body: fs.createReadStream(filePath) },
      },
      size,
      progressReceiver,
    );
    if (typeof id !== 'string') {
      throw new Error('upload failed');
    }
    await this.api.setThumbnail({
      videoId: id,
      media: { body: fs.createReadStream(thumbnailFilePath) },
    });
    return id;
  }

  async updateVideo(videoId: string, snippet: Snippet) {
    // preload snippet for categoryId
    const { items } = await this.api.listVideos({
      part: 'snippet',
      id: videoId,
    });
    if (items.length !== 1) {
      throw new Error(`Fetch video failed. id=${videoId} found=${items.length}`);
    }

    // remove null|undefined properties because these overwrites
    const cleanSnippet = { ...snippet };
    Object.keys(cleanSnippet)
      .filter(key => (<any>cleanSnippet)[key] == null)
      .forEach((key) => { delete (<any>cleanSnippet)[key]; });
    await this.api.updateVideo({
      part: 'snippet',
      resource: {
        id: videoId,
        snippet: { ...items[0].snippet, ...cleanSnippet },
      },
    });
  }

  async createPlaylist(playlist: Playlist, privacyStatus: PrivacyStatus) {
    await this.api.checkAuth();
    const { id } = await this.api.insertPlaylist({
      part: 'snippet,status',
      resource: {
        snippet: {
          title: playlist.title,
          description: playlist.description,
          tags: playlist.tags,
        },
        status: { privacyStatus },
      },
    });
    if (typeof id !== 'string') {
      throw new Error('creating playlist failed');
    }
    for (const item of playlist.items) {
      await this.createPlaylistItem(id, item.videoId, item.note);
    }
    return id;
  }

  private async createPlaylistItem(
    playlistId: string,
    videoId: string,
    note: string,
  ) {
    const itemParams = {
      part: 'snippet,contentDetails',
      resource: {
        snippet: {
          playlistId,
          resourceId: { videoId, kind: 'youtube#video' },
          // position:,
        },
        contentDetails: {
          note,
          // startAt:,
          // endAt:,
        },
      },
    };
    await this.api.insertPlaylistItem(itemParams);
  }
}
