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

  async download(
    _: string,
    __: string,
    ___: string,
    ____: string,
    _____: { progress(progress: number): void; },
  ) {
    process.stdout.write('download\n');
    return;
  }

  async downloadThumbnail(_: string, __: string, ___: string) {
    process.stdout.write('downloadThumbnail\n');
    return '';
  }

  async getMylist(_: string, __: string) {
    // tslint:disable:max-line-length
    return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>title‐ニコニコ動画</title>
    <link>http://www.nicovideo.jp/mylist/0</link>
    <atom:link rel="self"
               type="application/rss+xml"
               href="http://www.nicovideo.jp/mylist/0?rss=2.0"/>
    <description>description</description>
    <pubDate>Sun, 25 Feb 2018 00:00:00 +0900</pubDate>
    <lastBuildDate>Sun, 25 Feb 2018 00:00:00 +0900</lastBuildDate>
    <generator>ニコニコ動画</generator>
    <dc:creator>creator</dc:creator>
    <language>ja-jp</language>
    <copyright></copyright>
    <docs>http://blogs.law.harvard.edu/tech/rss</docs>
    <item>
      <title>title</title>
      <link>http://www.nicovideo.jp/watch/sm0</link>
      <guid isPermaLink="false"></guid>
      <pubDate>Sun, 25 Feb 2018 00:00:00 +0900</pubDate>
      <description><![CDATA[<p class="nico-memo">memo</p><p class="nico-thumbnail"><img alt="title" src="http://tn.smilevideo.jp/smile?i=0" width="94" height="70" border="0"/></p><p class="nico-description">description</p><p class="nico-info"><small><strong class="nico-info-length">0:00</strong>｜<strong class="nico-info-date">2014年01月01日 00：00：00</strong> 投稿</small></p>]]></description>
    </item>
  </channel>
</rss>
`;
    // tslint:enable:max-line-length
  }
}
