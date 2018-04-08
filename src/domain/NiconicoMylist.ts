import cheerio from 'cheerio';
import moment, { Moment } from 'moment';
import util from 'util';
import xml2js from 'xml2js';

const parseString: Function = util.promisify(xml2js.parseString);

export default class NiconicoMylist {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string,
    readonly items: ReadonlyArray<{
      readonly videoId: string;
      readonly description: string;
      readonly createdAt: Moment;
    }>,
  ) {
  }

  static async fromAPIXML(mylistId: string, mylistXML: string) {
    const xmlDocument: any = await parseString(mylistXML);
    if (xmlDocument.rss.channel[0].title[0] == null) {
      throw new Error('invalid mylist');
    }
    const items = (<any[]>xmlDocument.rss.channel[0].item).map((x: any) => ({
      videoId: /http:\/\/www\.nicovideo\.jp\/watch\/(.+)/.exec(x.link[0])![1],
      description: cheerio.load(x.description[0])('p.nico-memo').text(),
      createdAt: moment.parseZone(x.pubDate[0]),
    }));
    const numberOnly = /^[0-9]+$/;
    const communityOnlyVideos = items
      .filter(x => x.videoId.match(numberOnly))
      .map(x => x.videoId);
    return {
      communityOnlyVideos,
      niconicoMylist: new this(
        mylistId,
        /マイリスト (.+)‐ニコニコ動画/.exec(xmlDocument.rss.channel[0].title[0])![1],
        xmlDocument.rss.channel[0].description[0],
        items.filter(x => !x.videoId.match(numberOnly)),
      ),
    };
  }

  /**
   * 1件目が最新投稿になっている場合、逆順にソートする
   */
  sortIfReverseOrder() {
    if (this.items.some(x => x.createdAt.unix() > this.items[0].createdAt.unix())) {
      return this;
    }
    return new NiconicoMylist(
      this.id,
      this.name,
      this.description,
      [...this.items].reverse(),
    );
  }
}

export function parseMylistURL(url: string) {
  const m = /http:\/\/www\.nicovideo\.jp\/mylist\/(.+)/.exec(url);
  if (m == null || m[1] == null || m[1].length < 1) {
    throw new Error('invalid url');
  }
  return m[1];
}
