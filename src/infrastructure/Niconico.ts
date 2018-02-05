import fs from 'fs';
import fetch from 'node-fetch';
const progressStream = require('progress-stream');
import { Observable } from 'rxjs';

export default class Niconico {
  async getGetThumbInfo(videoId: string) {
    const res = await fetch(`http://ext.nicovideo.jp/api/getthumbinfo/${videoId}`);
    if (res.status !== 200) {
      throw new Error();
    }
    return res.text();
  }

  async createSessionCookie(email: string, password: string) {
    if (email.length <= 0 || password.length <= 0) {
      throw new Error('Require niconico login.');
    }
    const res = await fetch(
      'https://account.nicovideo.jp/api/v1/login?site=niconico',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        redirect: 'manual',
        body: [
          `mail_tel=${encodeURIComponent(email)}`,
          `password=${encodeURIComponent(password)}`,
        ].join('&'),
      },
    );
    if (
      res.status >= 400
      || res.headers.get('location').includes('message=cant_login')
    ) {
      throw new Error('Login failed.');
    }
    return res.headers.getAll('set-cookie')
      .filter(x => !x.startsWith('user_session=deleted;'))
      .map(x => x.slice(0, x.indexOf(';')))
      .join(';');
  }

  async getGetFlv(cookie: string, videoId: string) {
    const res = await fetch(
      `http://flapi.nicovideo.jp/api/getflv/${videoId}?as3=1`,
      { headers: { cookie } },
    );
    if (res.status !== 200) {
      throw new Error();
    }
    const body = await res.text();
    const url = getURLOnGetFLV(body);
    if (url == null) {
      return null;
    }
    return {
      url,
      isEconomy: url.endsWith('low'),
      isNm: url.endsWith('as3'),
    };
  }

  download(
    cookie: string,
    videoId: string,
    url: string,
    filePath: string,
  ) {
    return new Observable<number>((subscriber) => {
      (async () => {
        const preAccessResult = await fetch(`http://www.nicovideo.jp/watch/${videoId}`, {
          headers: { cookie },
          redirect: 'manual',
        });
        if (preAccessResult.status !== 200) {
          throw new Error();
        }
        const mainAccessResult = await fetch(url, {
          headers: {
            cookie: `${cookie};${preAccessResult.headers.getAll('set-cookie').join(';')}`,
          },
          redirect: 'manual',
        });
        if (mainAccessResult.status !== 200) {
          throw new Error();
        }
        const str = progressStream({
          length: mainAccessResult.headers.get('content-length'),
          time: 250,
        });
        str.on('progress', (progress: any) => {
          subscriber.next(progress.percentage);
        });
        if (filePath.length === 0) {
          return filePath; // debug use only
        }
        mainAccessResult.body
          .pipe(str)
          .pipe(fs.createWriteStream(filePath))
          .on('error', (e: Error) => { subscriber.error(e); })
          .on('finish', () => { subscriber.complete(); });
      })().catch((e) => { subscriber.error(e); });
    });
  }

  async downloadThumbnail(
    videoId: string,
    url: string,
    workingFolderPath: string,
  ) {
    const res = await fetch(url);
    if (res.status !== 200) {
      throw new Error();
    }
    const filePath = `${workingFolderPath}/${videoId}.jpg`;
    if (workingFolderPath.length === 0) {
      return filePath; // debug use only
    }
    await new Promise((resolve, reject) => {
      res.body.pipe(fs.createWriteStream(filePath))
        .on('error', reject)
        .on('finish', resolve);
    });
    return filePath;
  }
}

function getURLOnGetFLV(body: string): string | null {
  return body.split('&')
    .map(x => x.split('='))
    .map(x => ({ key: x[0], value: decodeURIComponent(x[1]) }))
    .filter(x => x.key === 'url')
    .map(x => x.value)[0];
}
