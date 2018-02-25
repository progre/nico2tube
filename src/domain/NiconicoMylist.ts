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
    readonly name: string,
    readonly description: string,
    readonly items: ReadonlyArray<{
      readonly videoId: string;
      readonly description: string;
    }>,
  ) {
  }

  static async fromAPIXML(mylistXML: string) {
    const xmlDocument: any = await parseString(mylistXML);
    if (xmlDocument.rss.channel[0].title[0] == null) {
      throw new Error('invalid mylist');
    }
    return new this(
      /マイリスト (.+)‐ニコニコ動画/.exec(xmlDocument.rss.channel[0].title[0])![1],
      xmlDocument.rss.channel[0].description[0],
      await Promise.all((<any[]>xmlDocument.rss.channel[0].item).map(async (x: any) => {
        return {
          videoId: /http:\/\/www\.nicovideo\.jp\/watch\/(.+)/.exec(x.link[0])![1],
          description: (await parseString(`<html>${x.description[0]}</html>`)).html.p[0]._,
        };
      })),
    );
  }
}
