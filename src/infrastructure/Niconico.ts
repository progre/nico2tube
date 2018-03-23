import fs from 'fs';
import { API } from 'nicovideo-api-nodejs-client';
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
    await downloadLargeFile(
      `${cookie};${preAccessResult.headers.getAll('set-cookie').join(';')}`,
      videoId,
      url,
      null,
      filePath,
      progressReceiver,
    );
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

  async downloadFromDmc(
    email: string,
    password: string,
    videoId: string,
    filePath: string,
    progressReceiver: { progress(progress: number): void; },
  ) {
    const session = new API.Session();
    await session.login(email, password);
    const video = new API.Video(session);
    const watchData = await video.getWatchData(videoId);
    const res = await (async () => {
      if (watchData.video.dmcInfo == null
        || watchData.video.dmcInfo.quality == null
      ) {
        if (watchData.video.smileInfo.url.endsWith('low')) {
          throw new Error('economy');
        }
        return video.getVideoStreamFromSmile(watchData);
      }
      if (watchData.video.dmcInfo.quality.videos.some(x => !x.available)
      ) {
        throw new Error('economy');
      }
      return video.getVideoStreamFromDmc(watchData);
    })();
    const contentLength = parseInt(res.headers['content-length'], 10);
    await transfer(
      res.data,
      contentLength,
      fs.createWriteStream(filePath),
      progressReceiver,
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

async function downloadLargeFile(
  cookie: string,
  videoId: string,
  url: string,
  range: { from: number, to: number } | null,
  filePath: string,
  progressReceiver: { progress(progress: number): void; },
): Promise<void> {
  const res = await fetch(url, {
    headers: {
      cookie,
      ...(range == null ? {} : { Range: `bytes=${range.from}-${range.to}` }),
    },
    redirect: 'manual',
  });
  if (range == null && res.status !== 200
    || range != null && res.status !== 206) {
    throw new Error(`Fetch failed. url=${url} status=${res.status}`);
  }
  if (filePath.length === 0) {
    return; // debug use only
  }
  const contentLength = parseInt(res.headers.get('content-length'), 10);
  const downloadedRatio = range == null ? 0 : range.from / range.to;
  await transfer(
    res.body,
    contentLength,
    fs.createWriteStream(filePath, range == null ? {} : { flags: 'a' }),
    {
      progress(progress: number) {
        progressReceiver.progress(downloadedRatio + (1 - downloadedRatio) * progress);
      },
    },
  );
  const stats = await stat(filePath);
  const expectFileSize = range == null ? contentLength : range.to;
  if (stats.size >= expectFileSize) {
    return;
  }
  console.log('retry', { from: stats.size, to: expectFileSize });
  // リトライ
  return downloadLargeFile(
    cookie,
    videoId,
    url,
    { from: stats.size, to: expectFileSize },
    filePath,
    progressReceiver,
  );
}

async function transfer(
  body: NodeJS.ReadableStream,
  contentLength: number,
  file: fs.WriteStream,
  progressReceiver: { progress(progress: number): void; },
) {
  const str = progressStream({ length: contentLength, time: 250 });
  str.on('progress', (progress: any) => {
    progressReceiver.progress(progress.percentage / 100);
  });
  let timer: any;
  await new Promise((resolve, reject) => {
    // ネットワーク切断などで通信が途絶えることを無理やり検知する
    let transferred = -1;
    timer = setInterval(
      () => {
        const progress = str.progress();
        if (transferred !== progress.transferred) {
          transferred = progress.transferred;
          return;
        }
        clearInterval(timer);
        // 1分間変化がなければタイムアウト
        file.close();
        reject(new Error('Force timeout'));
      },
      60 * 1000,
    );
    body
      .pipe(str)
      .pipe(file)
      .on('error', (e: Error) => { reject(e); })
      .on('finish', () => { resolve(); });
  });
  clearInterval(timer);
}

function getURLOnGetFLV(body: string): string | null {
  return body.split('&')
    .map(x => x.split('='))
    .map(x => ({ key: x[0], value: decodeURIComponent(x[1]) }))
    .filter(x => x.key === 'url')
    .map(x => x.value)[0];
}
