const youtubeAPI = require('youtube-api');
import util from 'util';

export async function insertVideo(
  params: any,
  size: number,
  progressReceiver: { progress(progress: number): void; },
) {
  return new Promise<any>((resolve, reject) => {
    let timer: any;
    const req = youtubeAPI.videos.insert(params, (err: any, data: any) => {
      clearInterval(timer);
      if (err != null) {
        err.message += ' (function: insertVideo)';
        reject(err);
        return;
      }
      resolve(data);
    });
    timer = setInterval(
      () => {
        progressReceiver.progress(req.req.connection._bytesDispatched / size);
      },
      250,
    );
  });
}

/**
 * 権限チェック
 */
export const checkAuth = (() => {
  const update = util.promisify(youtubeAPI.playlists.update);
  return async () => {
    try {
      await update({ part: 'snippet' });
    } catch (e) {
      if (e.code === 401) {
        throw e;
      }
    }
  };
})();

export const updateVideo = promisify('updateVideo', youtubeAPI.videos.update);
export const insertPlaylist = promisify('insertPlaylist', youtubeAPI.playlists.insert);
export const insertPlaylistItem = promisify('insertPlaylistItem', youtubeAPI.playlistItems.insert);
export const setThumbnail = promisify('setThumbnail', youtubeAPI.thumbnails.set);

function promisify(name: string, func: Function) {
  return async (params: any) => new Promise<any>((resolve, reject) => {
    func(params, (err: any, data: any) => {
      if (err != null) {
        console.error(JSON.stringify(err), JSON.stringify(params));
        err.message += ` (function: ${name})`;
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}
