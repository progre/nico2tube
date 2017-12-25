import * as electron from 'electron';
import * as uidSafe from 'uid-safe';
import Configuration from '../domain/Configuration';

export default class ConfigurationRepo {
  constructor(
    private webContents: electron.WebContents,
  ) {
  }

  async get() {
    const id = uidSafe.sync(8);
    return await new Promise<Configuration>((resolve, reject) => {
      electron.ipcMain.on(id, (event: any, arg: any) => {
        resolve(arg.configuration);
      });
      this.webContents.send('getConfiguration', { id });
    });
  }
}
