import fs from 'fs';
import fetch from 'node-fetch';
import util from 'util';
const progressStream = require('progress-stream');

const stat = util.promisify(fs.stat);

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
    const url = getURLOnGetFLV(await fetchURLWithCookie(
      `http://flapi.nicovideo.jp/api/getflv/${videoId}?as3=1`,
      cookie,
    ));
    if (url == null) {
      return null;
    }
    return {
      url,
      isEconomy: url.endsWith('low'),
      isNm: url.endsWith('as3'),
    };
  }

  async getWatchHTML(videoId: string) {
    const res = await fetch(`http://www.nicovideo.jp/watch/${videoId}`);
    if (res.status !== 200) {
      throw new Error();
    }
    return res.text();
  }

  async download(
    cookie: string,
    videoId: string,
    url: string,
    filePath: string,
    progressReceiver: { progress(progress: number): void; },
  ) {
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
      throw new Error(`Fetch failed. url=${url} status=${mainAccessResult.status}`);
    }
    const contentLength = parseInt(mainAccessResult.headers.get('content-length'), 10);
    const str = progressStream({
      length: contentLength,
      time: 250,
    });
    str.on('progress', (progress: any) => {
      progressReceiver.progress(progress.percentage / 100);
    });
    if (filePath.length === 0) {
      return; // debug use only
    }
    await new Promise((resolve, reject) => {
      mainAccessResult.body
        .pipe(str)
        .pipe(fs.createWriteStream(filePath))
        .on('error', (e: Error) => { reject(e); })
        .on('finish', () => { resolve(); });
    });
    const stats = await stat(filePath);
    if (stats.size !== contentLength) {
      throw new Error('Download failed');
    }
  }

  async downloadThumbnail(
    videoId: string,
    url: string,
    workingFolderPath: string,
  ) {
    const filePath = `${workingFolderPath}/${videoId}.jpg`;
    if (workingFolderPath.length === 0) {
      return filePath; // debug use only
    }
    await downloadFile(url, filePath);
    return filePath;
  }

  async getMylist(cookie: string, mylistId: string) {
    return fetchURLWithCookie(
      `http://www.nicovideo.jp/mylist/${mylistId}?rss=2.0`,
      cookie,
    );
  }
}

async function fetchURLWithCookie(url: string, cookie: string) {
  const res = await fetch(url, { headers: { cookie } });
  if (res.status !== 200) {
    throw new Error();
  }
  return res.text();
}

async function downloadFile(from: string, to: string) {
  const res = await fetch(from);
  if (res.status !== 200) {
    throw new Error();
  }
  await new Promise((resolve, reject) => {
    res.body.pipe(fs.createWriteStream(to))
      .on('error', reject)
      .on('finish', resolve);
  });
}

function getURLOnGetFLV(body: string): string | null {
  return body.split('&')
    .map(x => x.split('='))
    .map(x => ({ key: x[0], value: decodeURIComponent(x[1]) }))
    .filter(x => x.key === 'url')
    .map(x => x.value)[0];
}
