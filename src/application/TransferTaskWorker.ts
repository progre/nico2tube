import electron from 'electron';
import { Subject } from 'rxjs';
import NiconicoDownloader from '../domain/NiconicoDownloader';
import NiconicoVideo from '../domain/NiconicoVideo';
import { Task, TaskQueue } from '../domain/types';
import YoutubeUploader from '../domain/YoutubeUploader';
import ConfigurationRepo from '../infrastructure/ConfigurationRepo';
import Niconico from '../infrastructure/Niconico';
import NiconicoStub from '../infrastructure/NiconicoStub';
import Youtube from '../infrastructure/Youtube';
import YoutubeStub from '../infrastructure/YoutubeStub';

export default class TransferTaskWorker {
  private readonly configurationRepo: ConfigurationRepo;
  private readonly niconico: Niconico;
  private readonly niconicoDownloader: NiconicoDownloader;
  private readonly youtube: Youtube;
  private readonly youtubeUploader: YoutubeUploader;
  private readonly taskQueue: TaskQueue = [];

  // taskQueueUpdated = new Subject<{ niconicoURL: string }>();
  error = new Subject<Error>();

  constructor(dryRun: boolean, webContents: electron.WebContents) {
    if (dryRun) {
      this.niconico = <Niconico>new NiconicoStub();
      this.youtube = <Youtube>new YoutubeStub();
    } else {
      this.niconico = new Niconico();
      this.youtube = new Youtube();
    }
    this.configurationRepo = new ConfigurationRepo(webContents);
    this.niconicoDownloader = new NiconicoDownloader(
      this.configurationRepo,
      this.niconico,
    );
    this.youtubeUploader = new YoutubeUploader(this.youtube);

    this.niconicoDownloader.downloaded.subscribe(async ({ videoId, filePath }) => {
      try {
        await this.continueToUpload(videoId, filePath);
      } catch (e) {
        this.error.next(e);
      }
    });
    this.niconicoDownloader.error.subscribe(this.error);
    this.youtubeUploader.error.subscribe(this.error);
  }

  async authenticate() {
    await this.youtube.authenticate();
    this.youtubeUploader.ready();
  }

  enqueue(niconicoURL: string) {
    const isPlaylist = niconicoURL.includes('mylist');
    this.taskQueue.push(<Task>{
      niconicoURL,
      type: isPlaylist ? 'playlist' : 'video',
    });
    // this.taskQueueUpdated.next({ niconicoURL });
    if (isPlaylist) {
      // TODO: playlistを解体 async
    }
    this.niconicoDownloader.enqueue(niconicoURL);
  }

  private async continueToUpload(videoId: string, filePath: string) {
    const getThimbInfoXML = await this.niconico.getGetThumbInfo(videoId);
    const niconicoVideo = await NiconicoVideo.fromGetThumbInfoXML(getThimbInfoXML);
    const conf = await this.configurationRepo.get();
    const thumbnailFilePath = await this.niconico.downloadThumbnail(
      videoId,
      niconicoVideo.thumbnailURL,
      conf.workingFolderPath,
    );
    this.youtubeUploader.enqueue(
      filePath,
      thumbnailFilePath,
      niconicoVideo.toSnippet(),
    );
  }
}
