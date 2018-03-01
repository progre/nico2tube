import electron from 'electron';
const electronGoogleOauth = require('electron-google-oauth');
const googleOAuth = electronGoogleOauth(electron.BrowserWindow);
import fs from 'fs';
const encryptor = require('simple-encryptor')('2P54vcTFvrbvf6ga');
const youtubeAPI = require('youtube-api');

const statFile = async (filePath: string) => new Promise<fs.Stats>((resolve, reject) => {
  fs.stat(filePath, (err, data) => {
    if (err != null) {
      reject(err);
      return;
    }
    resolve(data);
  });
});
const updateVideo = async (params: any) => new Promise((resolve, reject) => {
  youtubeAPI.videos.update(params, (err: Error, data: any) => {
    if (err != null) {
      reject(err);
      return;
    }
    resolve(data);
  });
});
const updatePlaylist = async (params: any) => new Promise((resolve, reject) => {
  youtubeAPI.playlists.update(params, (err: Error, data: any) => {
    if (err != null) {
      reject(err);
      return;
    }
    resolve(data);
  });
});
const insertPlaylist = async (params: any) => new Promise<any>((resolve, reject) => {
  youtubeAPI.playlists.insert(params, (err: Error, data: any) => {
    if (err != null) {
      reject(err);
      return;
    }
    resolve(data);
  });
});
const insertPlaylistItem = async (params: any) => new Promise((resolve, reject) => {
  youtubeAPI.playlistItems.insert(params, (err: Error, data: any) => {
    if (err != null) {
      reject(err);
      return;
    }
    resolve(data);
  });
});

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

interface AccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export default class Youtube {
  private accessToken?: AccessToken;
  private authenticating = false;

  async authenticate() {
    if (this.authenticating) {
      return;
    }
    this.authenticating = true;
    const accessToken = await getAccessToken();
    if (accessToken != null) {
      this.accessToken = accessToken;
      youtubeAPI.authenticate({
        type: 'oauth',
        token: this.accessToken.access_token,
      });
    }
    this.authenticating = false;
  }

  async uploadVideo(
    filePath: string,
    thumbnailFilePath: string,
    snippet: Snippet,
    privacyStatus: PrivacyStatus,
    progressReceiver: { progress(progress: number): void; },
  ) {
    const { size } = await statFile(filePath);
    try { // 権限チェック
      await updateVideo({ part: 'snippet' });
    } catch (e) {
      if (e.code === 401) {
        throw e;
      }
    }
    const params = {
      part: 'snippet,status',
      resource: {
        snippet,
        status: { privacyStatus },
      },
      media: { body: fs.createReadStream(filePath) },
    };
    const { id } = await new Promise<any>((resolve, reject) => {
      let timer: any;
      const req = youtubeAPI.videos.insert(params, (err: any, data: any) => {
        clearInterval(timer);
        if (err != null) {
          reject(err);
          return;
        }
        resolve(data);
      });
      timer = setInterval(
        () => { progressReceiver.progress(req.req.connection._bytesDispatched / size); },
        250,
      );
    });
    if (typeof id !== 'string') {
      throw new Error('upload failed');
    }
    await uploadThumbnail(id, thumbnailFilePath);
    return id;
  }

  async createPlaylist(playlist: Playlist, privacyStatus: PrivacyStatus) {
    const playlistParams = {
      part: 'snippet,status',
      resource: {
        snippet: {
          title: playlist.title,
          description: playlist.description,
          tags: playlist.tags,
        },
        status: { privacyStatus },
      },
    };
    try { // 権限チェック
      await updatePlaylist({ part: 'snippet' });
    } catch (e) {
      if (e.code === 401) {
        throw e;
      }
    }
    const { id } = await insertPlaylist(playlistParams);
    if (typeof id !== 'string') {
      throw new Error('creating playlist failed');
    }
    for (const item of playlist.items) {
      const itemParams = {
        part: 'snippet,contentDetails',
        resource: {
          snippet: {
            playlistId: id,
            resourceId: {
              kind: 'youtube#video',
              videoId: item.videoId,
            },
            // position:,
          },
          contentDetails: {
            note: item.note,
            // startAt:,
            // endAt:,
          },
        },
      };
      await insertPlaylistItem(itemParams);
    }
  }
}

async function getAccessToken() {
  try {
    return <AccessToken>await googleOAuth.getAccessToken(
      [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.upload',
      ],
      // tslint:disable:max-line-length
      encryptor.decrypt('dd8351bd6c4259b262f70aeb9d3f2227a5ed6bdef0c3798882a4d0bb151fdf8a32eccb322d8370c42e26246e9d97ba57jXu8fWCt6UU4bHDuv24SC3o0tcZPY8MiZ067CyuA4GhH/SNPANiN3EvOIl23kIfh1wqCthvYdyG9vuvSXgWO7p8b5qlLBK9/yM7mkPN2Q8A='),
      encryptor.decrypt('880090244585df22a14ff228999cad3f7d6a98dc4f21df7de9dffc2a1269e99621703fea2b749e6622ce79a4aa1b1ccfWJiKoyS4V55UILG7uhkq2OuXahxnj2qmBqUZ7K4DGe4='),
      // tslint:enable:max-line-length
    );
  } catch (e) {
    if (e.message === 'User closed the window') {
      return null;
    }
    throw e;
  }
}

async function uploadThumbnail(videoId: string, filePath: string) {
  await new Promise((resolve, reject) => {
    youtubeAPI.thumbnails.set(
      { videoId, media: { body: fs.createReadStream(filePath) } },
      (err: any, _: any) => {
        if (err != null) {
          reject(err);
          return;
        }
        resolve();
      },
    );
  });
}
