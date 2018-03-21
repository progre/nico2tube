import moment, { Moment } from 'moment';
import xml2js from 'xml2js';

const parseString = async (xml: string) => new Promise<any>((resolve, reject) => {
  xml2js.parseString(xml, (err, result) => {
    if (err != null) {
      reject(err);
      return;
    }
    resolve(result);
  });
});

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
    return new this(
      mylistId,
      /マイリスト (.+)‐ニコニコ動画/.exec(xmlDocument.rss.channel[0].title[0])![1],
      xmlDocument.rss.channel[0].description[0],
      await Promise.all((<any[]>xmlDocument.rss.channel[0].item).map(async (x: any) => {
        return {
          videoId: /http:\/\/www\.nicovideo\.jp\/watch\/(.+)/.exec(x.link[0])![1],
          description: (await parseString(`<html>${x.description[0]}</html>`)).html.p[0]._,
          createdAt: moment.parseZone(x.pubDate[0]),
        };
      })),
    );
  }

  /**
   * 投稿が新しい順になっている場合のみ、古い順にソートする
   */
  sortIfReverseOrder() {
    const descItems = [...this.items];
    descItems.sort((a, b) => b.createdAt.unix() - a.createdAt.unix());
    if (this.items.every((x, i) => x !== descItems[i])) {
      return this;
    }
    const ascItems = [...this.items];
    ascItems.sort((a, b) => a.createdAt.unix() - b.createdAt.unix());
    return new NiconicoMylist(
      this.id,
      this.name,
      this.description,
      ascItems,
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
