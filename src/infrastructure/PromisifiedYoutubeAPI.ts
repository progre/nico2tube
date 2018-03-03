const youtubeAPI = require('youtube-api');

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

export const updateVideo = promisify(youtubeAPI.videos.update);
export const updatePlaylist = promisify(youtubeAPI.playlists.update);
export const insertPlaylist = promisify(youtubeAPI.playlists.insert);
export const insertPlaylistItem = promisify(youtubeAPI.playlistItems.insert);
export const setThumbnail = promisify(youtubeAPI.thumbnails.set);

function promisify(func: Function) {
  return async (params: any) => new Promise<any>((resolve, reject) => {
    func(params, (err: any, data: any) => {
      if (err != null) {
        console.error(JSON.stringify(err));
        reject(new Error(err.message));
        return;
      }
      resolve(data);
    });
  });
}
