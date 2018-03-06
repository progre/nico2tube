import electron from 'electron';
// @ts-ignore
import react from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import * as actions from '../actions/actions';
import Root, { Props } from '../components/Root';

function mapStateToProps(state: Props) {
  return state;
}

function mapDispatchToProps(dispatch: Dispatch<{}>) {
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
    onYoutubeAuthenticateClick(_: React.MouseEvent<HTMLInputElement>) {
      electron.ipcRenderer.send('authenticateYoutube');
    },
    onNiconicoURLAdd(url: string) {
      electron.ipcRenderer.send('addNiconicoURL', { url });
      dispatch(actions.clearURL());
    },
    onRetryClick(_: React.MouseEvent<HTMLInputElement>) {
      electron.ipcRenderer.send('retry');
    },
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
