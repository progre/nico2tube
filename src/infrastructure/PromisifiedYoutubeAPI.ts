// tslint:disable-next-line:no-implicit-dependencies
import electron from 'electron';
const electronGoogleOauth = require('electron-google-oauth');
import fetch from 'node-fetch';
const encryptor = require('simple-encryptor')('2P54vcTFvrbvf6ga');
import util from 'util';
const youtubeAPI = require('youtube-api');

const googleOAuth = electronGoogleOauth(electron.BrowserWindow);

interface AccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export default class PromisifiedYoutubeAPI {
  // tslint:disable:max-line-length
  private clientId = encryptor.decrypt('dd8351bd6c4259b262f70aeb9d3f2227a5ed6bdef0c3798882a4d0bb151fdf8a32eccb322d8370c42e26246e9d97ba57jXu8fWCt6UU4bHDuv24SC3o0tcZPY8MiZ067CyuA4GhH/SNPANiN3EvOIl23kIfh1wqCthvYdyG9vuvSXgWO7p8b5qlLBK9/yM7mkPN2Q8A=');
  private clientSecret = encryptor.decrypt('880090244585df22a14ff228999cad3f7d6a98dc4f21df7de9dffc2a1269e99621703fea2b749e6622ce79a4aa1b1ccfWJiKoyS4V55UILG7uhkq2OuXahxnj2qmBqUZ7K4DGe4=');
  // tslint:enable:max-line-length
  private refreshToken!: string;

  async authenticate() {
    const accessToken = await getAccessToken(this.clientId, this.clientSecret);
    if (accessToken == null) {
      return;
    }
    youtubeAPI.authenticate({
      type: 'oauth',
      token: accessToken.access_token,
    });
    this.refreshToken = accessToken.refresh_token;
  }

  async insertVideo(
    params: any,
    size: number,
    progressReceiver: { progress(progress: number): void; },
  ): Promise<any> {
    try {
      return await new Promise<any>((resolve, reject) => {
        let timer: any;
        const req = youtubeAPI.videos.insert(params, (err: any, data: any) => {
          clearInterval(timer);
          if (err != null) {
            err.message += ' (function: insertVideo)';
            reject(err);
            return;
          }
          resolve(data);
        });
        timer = setInterval(
          () => {
            progressReceiver.progress(req.req.connection._bytesDispatched / size);
          },
          250,
        );
      });
    } catch (e) {
      if (e.message !== 'Invalid Credentials') {
        e.message += ' (function: insertVideo)';
        throw e;
      }
    }
    await refreshAccessToken(this.clientId, this.clientSecret, this.refreshToken);
    return this.insertVideo(params, size, progressReceiver);
  }

  /**
   * 権限チェック
   */
  checkAuth = (() => {
    const update = util.promisify(youtubeAPI.playlists.update);
    return async (): Promise<void> => {
      try {
        await update({ part: 'snippet' });
      } catch (e) {
        if (e.message === 'Login Required') {
          throw e;
        }
        if (e.message !== 'Invalid Credentials') {
          return;
        }
      }
      await refreshAccessToken(this.clientId, this.clientSecret, this.refreshToken);
      return this.checkAuth();
    };
  })();

  listVideos = this.promisify('listVideos', youtubeAPI.videos.list);
  updateVideo = this.promisify('updateVideo', youtubeAPI.videos.update);
  insertPlaylist = this.promisify('insertPlaylist', youtubeAPI.playlists.insert);
  insertPlaylistItem = this.promisify('insertPlaylistItem', youtubeAPI.playlistItems.insert);
  setThumbnail = this.promisify('setThumbnail', youtubeAPI.thumbnails.set);

  promisify(name: string, func: Function) {
    const promisifiedFunc = util.promisify(func);
    return async (params: any) => {
      try {
        return await promisifiedFunc(params);
      } catch (e) {
        if (e.message !== 'Invalid Credentials') {
          console.error(JSON.stringify(e), JSON.stringify(params));
          e.message += ` (function: ${name})`;
          throw e;
        }
        console.log(`refreshing access token (reason: ${e.message})`);
      }
      await refreshAccessToken(this.clientId, this.clientSecret, this.refreshToken);
      return this.promisify(name, func);
    };
  }
}

async function refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch('https://accounts.google.com/o/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: [
      `client_id=${clientId}`,
      `client_secret=${clientSecret}`,
      `refresh_token=${refreshToken}`,
      `grant_type=refresh_token`,
    ].join('&'),
  });
  const tokens = await res.json();
  youtubeAPI.authenticate({
    type: 'oauth',
    token: tokens.access_token,
  });
}

async function getAccessToken(clientId: string, clientSecret: string) {
  try {
    return <AccessToken>await googleOAuth.getAccessToken(
      [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.upload',
      ],
      clientId,
      clientSecret,
    );
  } catch (e) {
    if (e.message === 'User closed the window') {
      return null;
    }
    throw e;
  }
}
