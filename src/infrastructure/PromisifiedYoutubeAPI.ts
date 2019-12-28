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
  private clientId = encryptor.decrypt('3213323974022a8dadb354406885990b9d3bb664d3dd13d33e3821280867561bb8b16ec21176af4a65e4508eb8ada11f2O7ZhyvqN4zkoWJKGqUtsZcvf8XpmjVab/TFK5uD/4emLAIFWiC4y6oLjXGxdMOhXhMoxzl6u+8+L797Ql9thklTWQRYhKBHkLhWdBifwAo=');
  private clientSecret = encryptor.decrypt('627a6ef9537ed638fe5d13ec50763a2fcc3fc0f8b5bda1d70dc9aa9219893903a0cd70e3ccd9bfa858f38cc453ef38e1+h4wNNzhTBEwz88CsTEcSo1cgA3rKBJX90nJkWSLhrQ=');
  // tslint:enable:max-line-length
  private refreshToken!: string;

  async authenticate() {
    console.log('authenticate');
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
    console.log('insertVideo');
    try {
      return await new Promise<any>((resolve, reject) => {
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
          () => {
            progressReceiver.progress(req.req.connection._bytesDispatched / size);
          },
          250,
        );
      });
    } catch (e) {
      if (e.message !== 'Invalid Credentials') {
        e.message += ` (function: insertVideo, params: ${JSON.stringify(params)})`;
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
    console.log('checkAuth');
    const update = util.promisify(youtubeAPI.playlists.update);
    return async (): Promise<void> => {
      try {
        console.log(await update({ part: 'snippet' }));
      } catch (e) {
        if (e.message === 'Login Required') {
          throw e;
        }
        if (e.message !== 'Invalid Credentials') {
          return;
        }
      }
      console.log(`refreshing access token (reason: check failed`);
      await refreshAccessToken(this.clientId, this.clientSecret, this.refreshToken);
      return this.checkAuth();
    };
  })();

  listVideos = this.promisify('listVideos', youtubeAPI.videos.list);
  updateVideo = this.promisify('updateVideo', youtubeAPI.videos.update);
  insertPlaylist = this.promisify('insertPlaylist', youtubeAPI.playlists.insert);
  insertPlaylistItem = this.promisify('insertPlaylistItem', youtubeAPI.playlistItems.insert);
  setThumbnail = this.promisify('setThumbnail', youtubeAPI.thumbnails.set);

  private promisify(name: string, func: Function) {
    const promisifiedFunc = util.promisify(func);
    return async (params: any) => {
      console.log(name);
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
