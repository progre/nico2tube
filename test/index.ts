// http://ext.nicovideo.jp/api/getthumbinfo/sm23699380
// ログイン不要

// http://www.nicovideo.jp/api/getflv/[動画番号]?as3=1

// http://smile-cll18.nicovideo.jp/smile?m=7741668.38239low
// エコノミー時low
// http://iancoog.altervista.org/ を通せばnmもffmpegかけられるらしい

// tslint:disable:no-unused-expression
import { expect } from 'chai';
import fetch from 'node-fetch';
import { xmlToSnippet } from '../src/domain/metaconverter';
import Niconico from '../src/infrastructure/Niconico';

describe('getflv', () => {
  let email: string;
  let password: string;

  before(() => {
    email = process.env.NICONICO_EMAIL!;
    password = process.env.NICONICO_PASSWORD!;
    expect(email).to.be.a('string');
    expect(password).to.be.a('string');
  });

  it('outputs video infomation', async () => {
    const niconico = new Niconico();
    const userSession = (await niconico.createSessionCookie(email, password))!;
    expect(userSession).to.be.a('string');
    const result = (await niconico.getGetFlv(userSession, 'sm23699380'))!;
    expect(result).to.be.a('object');
    expect(result.isEconomy).to.be.false;
    expect(result.isNm).to.be.false;
    expect(result.url).eq('http://smile-pom51.nicovideo.jp/smile?m=23699380.90052');
    await niconico.download(userSession, 'sm23699380', result.url, '');
  });
});

describe('meta converter', () => {
  it('convert from niconico to YouTube', async () => {
    // tslint:disable:max-line-length
    const src = `<?xml version="1.0" encoding="UTF-8"?>
<nicovideo_thumb_response status="ok">
  <thumb>
    <video_id>sm23699380</video_id>
    <title>【minecraft】村MODで街を作ってみました</title>
    <description>Millenaireの設定を調整して建築物の数を大幅に増やしました。どこまでも自然が続くマインクラフトの世界が一変しました。こういった環境でプレイするのも面白いかもしれませんね。続編→sm23836065</description>
    <thumbnail_url>http://tn.smilevideo.jp/smile?i=23699380</thumbnail_url>
    <first_retrieve>2014-06-03T19:31:08+09:00</first_retrieve>
    <length>7:03</length>
    <movie_type>mp4</movie_type>
    <size_high>27828033</size_high>
    <size_low>22328965</size_low>
    <view_counter>622</view_counter>
    <comment_num>10</comment_num>
    <mylist_counter>1</mylist_counter>
    <last_res_body>インド多くね? 時間がたつにつれてク おいすー^^ ヒャッハー! (‘Д´) ( ゜∀... </last_res_body>
    <watch_url>http://www.nicovideo.jp/watch/sm23699380</watch_url>
    <thumb_type>video</thumb_type>
    <embeddable>1</embeddable>
    <no_live_play>0</no_live_play>
    <tags domain="jp">
      <tag category="1" lock="1">ゲーム</tag>
      <tag lock="1">Minecraft</tag>
      <tag>マインクラフト</tag>
      <tag lock="1">村MOD</tag>
      <tag lock="1">Millenaire</tag>
    </tags>
    <user_id>1762235</user_id>
    <user_nickname>ぷろぐれ</user_nickname>
    <user_icon_url>https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/s/176/1762235.jpg?1430361209</user_icon_url>
  </thumb>
</nicovideo_thumb_response>`;
    // tslint:enable:max-line-length
    const dst = await xmlToSnippet(src);
    expect(dst).to.deep.equal({
      title: '【minecraft】村MODで街を作ってみました',
      // tslint:disable-next-line:max-line-length
      description: 'Millenaireの設定を調整して建築物の数を大幅に増やしました。どこまでも自然が続くマインクラフトの世界が一変しました。こういった環境でプレイするのも面白いかもしれませんね。続編→sm23836065',
      tags: ['ゲーム', 'Minecraft', 'マインクラフト', '村MOD', 'Millenaire'],
      // categoryId?: string,
    });
  });
});
