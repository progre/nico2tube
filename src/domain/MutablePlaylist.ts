import { Snippet } from '../infrastructure/Youtube';
import NiconicoMylist from './NiconicoMylist';

export default class MutablePlaylist {
  constructor(
    public readonly niconicoMylistId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly tags: string[],
    public readonly items: {
      readonly niconicoVideoId: string;
      readonly note: string;
      videoId?: string;
      videoSnippet?: Snippet;
    }[],
  ) {
  }

  static fromMylist(mylist: NiconicoMylist): MutablePlaylist {
    return new this(
      mylist.id,
      mylist.name,
      mylist.description,
      [],
      mylist.items.map(x => ({
        niconicoVideoId: x.videoId,
        note: x.description,
      })),
    );
  }

  toReplaceMap(playlistId: string) {
    return [
      {
        from: `mylist/${this.niconicoMylistId}`,
        to: `https://www.youtube.com/playlist?list=${playlistId}`,
      },
      ...this.items.map(x => ({
        from: x.niconicoVideoId,
        to: `https://www.youtube.com/watch?v=${x.videoId}`,
      })),
    ];
  }
}
