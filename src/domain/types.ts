// ほげほげマイリスト _niconico → _YouTube
//   - 完了 動画 _niconico → _YouTube
//   - アップロード 動画前の 30% _niconico → _YouTube
//   - ダウンロード 動画 75% _niconico → _YouTube
//   - ダウンロード 動画つづき _niconico
//   - ダウンロード 動画まだある _niconico
// ほげほげマイリスト2 _niconico
// ほげほげマイリスト3 _niconico
// ほげほげマイリスト4 _niconico

export type TaskQueue = Task[];

export type Task = PlaylistTask | VideoTask;

export interface PlaylistTask {
  readonly niconicoURL: string;
  readonly type: 'playlist';
  title?: string;
  youtubeURL?: string;
  videoTasks?: ReadonlyArray<string>;
}

export interface VideoTask {
  readonly niconicoURL: string;
  readonly type: 'video';
  title?: string;
  youtubeURL?: string;
  downloadProgress?: number;
  uploadProgress?: number;
}

export interface ApplicationError extends Error {
  label?: string;
}
