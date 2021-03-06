import electron from 'electron';
import uid from 'uid-safe';
import Configuration from '../domain/Configuration';

export default class ConfigurationRepo {
  constructor(
    private webContents: electron.WebContents,
  ) {
  }

  async get() {
    const id = uid.sync(8);
    return new Promise<Configuration>((resolve, _) => {
      electron.ipcMain.on(id, (__: any, arg: any) => {
        resolve(arg.configuration);
      });
      this.webContents.send('getConfiguration', { id });
    });
  }
}
