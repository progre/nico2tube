import moment from 'moment';
import xml2js from 'xml2js';

async function parseXMLFromString(xmlString: string) {
  return new Promise<any>((resolve, reject) => {
    xml2js.parseString(xmlString, (err, result) => {
      if (err != null) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

export default class NiconicoVideo {
  constructor(
    readonly title: string,
    readonly description: string,
    readonly createdAt: string, // yyyy-MM-ddTHH:mm:ss+09:00
    readonly category: string | null,
    readonly tags: ReadonlyArray<string>,
    readonly thumbnailURL: string,
    readonly watchURL: string,
  ) {
  }

  // http://ext.nicovideo.jp/api/getthumbinfo/*
  static async fromGetThumbInfoXMLAndAPIData(xmlString: string, apiData: any) {
    const xmlDocument = await parseXMLFromString(xmlString);
    const thumb = xmlDocument.nicovideo_thumb_response.thumb[0];
    const category: string | null = (
      thumb.tags[0].tag.filter((x: any) => x.$ != null && x.$.category != null)[0]
      || { _: null }
    )._;
    return new this(
      thumb.title[0],
      createDescription(apiData, []),
      thumb.first_retrieve[0],
      category,
      thumb.tags[0].tag.map((x: any) => typeof x === 'string' ? x : x._),
      thumb.thumbnail_url[0],
      thumb.watch_url[0],
    );
  }

  toSnippet() {
    const date = moment.parseZone(this.createdAt)
      .format('YYYY-MM-DD[T]HH:mm:ss.SSSZZ');
    return {
      title: this.title,
      description: `${this.description}\n\n`
        + `Original upload date: ${date}\n`
        + `Uploaded with nico2tube https://github.com/progre/nico2tube#readme`,
      tags: this.tags.map(x => x.replace(/</g, '＜').replace(/>/g, '＞')), // YouTube doesn't allow.
      categoryId: convertCategory(this.category),
    };
  }
}

export function toVideoId(url: string) {
  // http://www.nicovideo.jp/watch/sm25208487
  const regExpArray = /.*(sm[0-9]+)/.exec(url);
  if (regExpArray == null) {
    return null;
  }
  return regExpArray[1];
}

export function parseAPIData(html: string) {
  const m = /data-api-data="(.*?)"/.exec(html);
  if (m == null) {
    return null;
  }
  return JSON.parse(m[1].replace(/&quot;/g, '\"'));
}

// http://dic.nicovideo.jp/a/カテゴリタグ
// https://developers.google.com/youtube/v3/docs/videoCategories/list#try-it
//   part=id,snippet regionCode=JP
// tslint:disable-next-line:cyclomatic-complexity
function convertCategory(category: string | null) {
  if (category == null) {
    return null;
  }
  const convertMap = <{ [category: string]: number | null }>{
    エンターテイメント: 24,
    音楽: 10,
    歌ってみた: 10,
    演奏してみた: 10,
    踊ってみた: 10,
    VOCALOID: 10,
    ニコニコインディーズ: 10,
    動物: 15,
    料理: 26, // Howto & Style
    自然: 19, // Travel & Events
    旅行: 19,
    スポーツ: 17,
    ニコニコ動画講座: 26,
    車載動画: 2,
    歴史: 27, // Education
    科学: 28,
    ニコニコ技術部: 28,
    ニコニコ手芸部: 26, // Howto & Style
    作ってみた: 26, // Howto & Style
    政治: 25,
    アニメ: 1,
    ゲーム: 20,
    東方: 24, // Entertainment
    アイドルマスター: 24, // Entertainment
    ラジオ: 24, // Entertainment
    描いてみた: 26, // Howto & Style
    例のアレ: 23, // Comedy
    その他: null,
    日記: 22,
    'R-18': null,
    ファッション: 22, // People & Blogs
  };
  return convertMap[category];
}

function createDescription(
  apiData: any,
  replaceMap: { from: string, to: string }[],
) {
  return replaceNiconicoURL(
    unescapeOriginalDescription(apiData.video.originalDescription),
    replaceMap,
  );
}

function unescapeOriginalDescription(originalDescription: string) {
  return originalDescription
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<br \/>/g, '\n')
    .replace(/<.+?>/g, '');
}

export function replaceNiconicoURL(
  description: string,
  replaceMap: { from: string, to: string }[],
) {
  for (const replace of replaceMap) {
    // tslint:disable-next-line:no-parameter-reassignment
    description = description.replace(new RegExp(replace.from, 'g'), replace.to);
  }
  return description;
}
