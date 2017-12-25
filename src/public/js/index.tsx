import * as electron from 'electron';
import * as React from 'react';
import * as reactDOM from 'react-dom';
import * as reactRedux from 'react-redux';
import * as redux from 'redux';
import * as reduxPersist from 'redux-persist';
import { addError, setQueue } from './actions/actions';
import App from './containers/App';
import reducer from './reducers/reducer';
import { createInitialState, State } from './state';

async function main() {
  const store = redux.createStore<State>(
    reducer,
    {} as any,
    reduxPersist.autoRehydrate({
      stateReconciler: (state: any, inboundState: any, reducedState: any) =>
        createInitialState(inboundState),
    }),
  );
  await new Promise(resolve => reduxPersist.persistStore(store, {}, resolve));
  reactDOM.render(
    <reactRedux.Provider store={store}>
      <App />
    </reactRedux.Provider>,
    document.getElementsByTagName('main')[0],
  );
  listenIPC(store);
}

function listenIPC(store: redux.Store<State>) {
  electron.ipcRenderer.on('getConfiguration', (event: any, arg: { id: string }) => {
    if (arg.id == null) { throw new Error('logic error'); }
    electron.ipcRenderer.send(arg.id, {
      configuration: store.getState().configuration,
    });
  });
  electron.ipcRenderer.on('addError', (event: any, arg: { message: string }) => {
    if (arg.message == null) { throw new Error('logic error'); }
    store.dispatch(addError(arg.message));
  });
  electron.ipcRenderer.on('setQueue', (event: any, arg: { queue: ReadonlyArray<string> }) => {
    if (arg.queue == null) { throw new Error('logic error'); }
    store.dispatch(setQueue(arg.queue));
  });
}

main().catch((e) => { console.error(e.stack || e); });
