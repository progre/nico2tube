import { Snippet } from '../infrastructure/Youtube';
import NiconicoMylist from './NiconicoMylist';

export default class MutablePlaylist {
  public youtubePlaylistId?: string;

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

  setYoutubeVideoToItem(niconicoVideoId: string, youtubeVideoId: string, snippet: Snippet) {
    const item = this.items.find(x => x.niconicoVideoId === niconicoVideoId);
    if (item == null) {
      return;
    }
    item.videoId = youtubeVideoId;
    item.videoSnippet = snippet;
  }

  toReplaceMap() {
    if (this.youtubePlaylistId == null) {
      throw new Error('logic error');
    }
    return [
      {
        from: `mylist/${this.niconicoMylistId}`,
        to: `https://www.youtube.com/playlist?list=${this.youtubePlaylistId}`,
      },
      ...this.items.map(x => ({
        from: x.niconicoVideoId,
        to: `https://www.youtube.com/watch?v=${x.videoId}`,
      })),
    ];
  }
}
