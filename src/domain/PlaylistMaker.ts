import { Subject } from 'rxjs';
import Youtube, { Playlist, PrivacyStatus } from '../infrastructure/Youtube';
import MutablePlaylist from './MutablePlaylist';
import { replaceNiconicoURL } from './NiconicoVideo';
import SequentialWorker from './SequentialWorker';
import { ApplicationError } from './types';

export default class PlaylistMaker {
  private readonly sequentialWorker = new SequentialWorker();
  readonly authenticationRequired = new Subject();
  readonly created = new Subject<{
    niconicoMylistId: string;
  }>();
  readonly error: Subject<ApplicationError> = this.sequentialWorker.error;

  constructor(
    private readonly youtube: Youtube,
    private readonly privacyStatus: PrivacyStatus,
  ) {
  }

  ready() {
    this.sequentialWorker.ready();
  }

  enqueue(playlist: MutablePlaylist) {
    this.sequentialWorker.enqueue(
      `mylist/${playlist.niconicoMylistId}`,
      // tslint:disable-next-line:promise-function-async promise-must-complete
      async () => {
        await this.task(playlist);
        this.created.next({ niconicoMylistId: playlist.niconicoMylistId });
      },
    );
  }

  private async task(playlist: MutablePlaylist) {
    const playlistId = await this.youtube.createPlaylist(
      <Playlist>playlist,
      this.privacyStatus,
    );
    playlist.youtubePlaylistId = playlistId;
    const replaceMap = playlist.toReplaceMap();
    for (const item of playlist.items) {
      const description = replaceNiconicoURL(
        item.videoSnippet!.description,
        replaceMap,
      );
      await this.youtube.updateVideo(
        item.videoId!,
        {
          ...item.videoSnippet!,
          description,
        },
      );
    }
  }
}
