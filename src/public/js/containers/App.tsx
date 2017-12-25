import * as electron from 'electron';
// @ts-ignore
import * as react from 'react';
import * as reactRedux from 'react-redux';
import * as Redux from 'redux';
import * as actions from '../actions/actions';
import Root, { Props } from '../components/Root';

function mapStateToProps(state: Props) {
  return state;
}

function mapDispatchToProps(dispatch: Redux.Dispatch<{}>) {
  return {
    onNiconicoEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
      dispatch(actions.setNiconicoEmail(e.target.value));
    },
    onNiconicoPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
      dispatch(actions.setNiconicoPassword(e.target.value));
    },
    onWorkingFolderPathChange(e: React.ChangeEvent<HTMLInputElement>) {
      dispatch(actions.setWorkingFolderPath(e.target.value));
    },
    onYoutubeAuthenticateClick(e: React.MouseEvent<HTMLInputElement>) {
      electron.ipcRenderer.send('authenticateYoutube');
    },
    onNiconicoURLAdd(url: string) {
      electron.ipcRenderer.send('addNiconicoURL', { url });
      dispatch(actions.clearURL());
    },
  };
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Root);
