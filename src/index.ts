try { require('source-map-support').install(); } catch (e) { /* NOP */ }
import electron from 'electron';
const { app, BrowserWindow, ipcMain } = electron;
import TransferTaskWorker from './application/TransferTaskWorker';

async function main() {
  await new Promise((resolve, _) => app.once('ready', resolve));
  app.on('window-all-closed', () => { app.quit(); });
  start();
}

function start() {
  const win = createWindow();
  const transferTaskWorker = new TransferTaskWorker(
    process.argv.includes('--dry-run'),
    win.webContents,
  );
  listenIPC(transferTaskWorker);
  listenDomain(transferTaskWorker, win.webContents);
  win.loadURL(`file://${__dirname}/public/index.html`);
}

function createWindow() {
  return new BrowserWindow({
    width: 800,
    height: 600,
    resizable: true,
    show: true,
  });
}

function listenDomain(
  transferTaskWorker: TransferTaskWorker,
  webContents: electron.WebContents,
) {
  transferTaskWorker.error.subscribe((e) => {
    console.error(e.stack || e);
    webContents.send('addError', { message: e.message });
  });
  // transferTaskWorker.queueUpdated.subscribe(() => {
  //   webContents.send('setQueue', { queue: niconicoDownloader.queue() });
  // });
}

function listenIPC(transferTaskWorker: TransferTaskWorker) {
  ipcMain.on('authenticateYoutube', async () => {
    await transferTaskWorker.authenticate();
  });
  ipcMain.on('addNiconicoURL', (_: any, { url }: { url: string }) => {
    transferTaskWorker.enqueue(url);
  });
}

main().catch((e) => { console.error(e.stack || e); });
