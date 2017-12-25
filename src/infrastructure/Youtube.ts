import * as electron from 'electron';
const electronGoogleOauth = require('electron-google-oauth');
const googleOAuth = electronGoogleOauth(electron.BrowserWindow);
import * as fs from 'fs';
import { Observable } from 'rxjs';
const encryptor = require('simple-encryptor')('2P54vcTFvrbvf6ga');
const youtubeAPI = require('youtube-api');

interface AccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export type PrivacyStatus = 'public' | 'private' | 'unlisted';

export interface Snippet {
  title: string;
  description: string;
  tags: ReadonlyArray<string>;
  categoryId?: string;
}

async function getAccessToken() {
  try {
    return <AccessToken>await googleOAuth.getAccessToken(
      ['https://www.googleapis.com/auth/youtube.upload'],
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

export default class Youtube {
  private accessToken: AccessToken;
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

  upload(
    filePath: string,
    thumbnailFilePath: string,
    snippet: Snippet,
    privacyStatus: PrivacyStatus,
  ) {
    return new Observable<number>((subscriber) => {
      fs.stat(filePath, (err1, { size }) => {
        if (err1! != null) {
          subscriber.error(err1);
          return;
        }
        const params = {
          part: 'snippet,status',
          resource: {
            snippet,
            status: { privacyStatus },
          },
          media: { body: fs.createReadStream(filePath) },
        };
        const req = youtubeAPI.videos.insert(params, (err: any, data: any) => {
          if (err != null) {
            subscriber.error(err);
            return;
          }
          uploadThumbnail(data.id, thumbnailFilePath)
            .then(() => { subscriber.complete(); })
            .catch((e) => { subscriber.error(e); });
        });
        setInterval(
          () => { subscriber.next(req.req.connection._bytesDispatched / size); },
          250,
        );
      });
    });
  }
}

async function uploadThumbnail(videoId: string, filePath: string) {
  await new Promise((resolve, reject) => {
    youtubeAPI.thumbnails.set(
      { videoId, media: { body: fs.createReadStream(filePath) } },
      (err: any, data: any) => {
        if (err != null) {
          reject(err);
          return;
        }
        resolve();
      },
    );
  });
}
