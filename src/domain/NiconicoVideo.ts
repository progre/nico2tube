import xml2js from 'xml2js';

export default class NiconicoVideo {
  constructor(
    readonly title: string,
    readonly description: string,
    readonly createdAt: string, // yyyy-MM-ddTHH:mm:ss+09:00
    readonly category: number,
    readonly tags: ReadonlyArray<string>,
    readonly thumbnailURL: string,
    readonly watchURL: string,
  ) {
  }

  // http://ext.nicovideo.jp/api/getthumbinfo/*
  static async fromGetThumbInfoXML(xmlString: string) {
    const xmlDocument: any = await new Promise((resolve, reject) => {
      xml2js.parseString(xmlString, (err, result) => {
        if (err != null) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
    const thumb = xmlDocument.nicovideo_thumb_response.thumb[0];
    return new this(
      thumb.title[0],
      thumb.description[0],
      thumb.first_retrieve[0],
      thumb.tags[0].tag, // category
      thumb.tags[0].tag.map((x: any) => typeof x === 'string' ? x : x._),
      thumb.thumbnail_url[0],
      thumb.watch_url[0],
    );
  }

  toSnippet() {
    // TODO: 出力項目の精査
    return {
      title: this.title,
      description: this.description,
      tags: this.tags,
      // categoryId?: string;
    };
  }

  // http://dic.nicovideo.jp/a/%E3%82%AB%E3%83%86%E3%82%B4%E3%83%AA%E3%82%BF%E3%82%B0
  // https://developers.google.com/apis-explorer/#p/youtube/v3/youtube.videoCategories.list?part=snippet&hl=ja&regionCode=jp&fields=items(id%252Csnippet)&_h=1&
}

export function toVideoId(url: string) {
  // http://www.nicovideo.jp/watch/sm25208487
  const regExpArray = /.*(sm[0-9]+)/.exec(url);
  if (regExpArray == null) {
    return null;
  }
  return regExpArray[1];
}
