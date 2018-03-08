// tslint:disable-next-line:no-implicit-dependencies
import electron from 'electron';
const electronGoogleOauth = require('electron-google-oauth');
const googleOAuth = electronGoogleOauth(electron.BrowserWindow);
import fs from 'fs';
const encryptor = require('simple-encryptor')('2P54vcTFvrbvf6ga');
import util from 'util';
import {
  checkAuth,
  insertPlaylist,
  insertPlaylistItem,
  insertVideo,
  listVideos,
  setThumbnail,
  updateVideo,
} from './PromisifiedYoutubeAPI';
const youtubeAPI = require('youtube-api');

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
    await checkAuth();
    const { id } = await insertVideo(
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
    await setThumbnail({
      videoId: id,
      media: { body: fs.createReadStream(thumbnailFilePath) },
    });
    return id;
  }

  async updateVideo(videoId: string, snippet: Snippet) {
    // preload snippet for categoryId
    const { items } = await listVideos({
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
    await updateVideo({
      part: 'snippet',
      resource: {
        id: videoId,
        snippet: { ...items[0].snippet, ...cleanSnippet },
      },
    });
  }

  async createPlaylist(playlist: Playlist, privacyStatus: PrivacyStatus) {
    await checkAuth();
    const { id } = await insertPlaylist({
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
      await createPlaylistItem(id, item.videoId, item.note);
    }
    return id;
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

async function createPlaylistItem(
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
  await insertPlaylistItem(itemParams);
}
