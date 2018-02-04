import { Observable } from 'rxjs';

export default class NiconicoStub {
  async getGetThumbInfo(_: string) {
    process.stdout.write('getGetThumbInfo\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<nicovideo_thumb_response status="ok">
  <thumb>
    <title>title</title>
    <description>describe</description>
    <thumbnail_url>http://tn.smilevideo.jp/smile?i=0</thumbnail_url>
    <first_retrieve>2000-01-01T00:00:00+09:00</first_retrieve>
    <watch_url>http://www.nicovideo.jp/watch/sm0</watch_url>
    <tags domain="jp">
      <tag category="1" lock="1">ゲーム</tag>
      <tag lock="1">tag1</tag>
      <tag lock="1">tag2</tag>
      <tag lock="1">tag3</tag>
    </tags>
  </thumb>
</nicovideo_thumb_response>`;
  }

  async createSessionCookie(_: string, __: string) {
    process.stdout.write('createSessionCookie\n');
    return '';
  }

  async getGetFlv(_: string, __: string) {
    process.stdout.write('getGetFlv\n');
    return {
      url: '',
      isEconomy: false,
      isNm: false,
    };
  }

  download(
    _: string,
    __: string,
    ___: string,
    ____: string,
  ) {
    process.stdout.write('download\n');
    return new Observable((subscriber) => { subscriber.complete(); });
  }

  async downloadThumbnail(
    _: string,
    __: string,
    ___: string,
  ) {
    process.stdout.write('downloadThumbnail\n');
    return '';
  }
}
