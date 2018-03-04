import { TextField } from 'material-ui';
import React from 'react';
import ConfigurationDomain from '../../../domain/Configuration';
import Configuration from './Configuration';
import TextAdd from './TextAdd';

export interface Props {
  configuration: ConfigurationDomain;
  taskList: {
    errors: ReadonlyArray<string>;
    message: string;
  };

  onNiconicoEmailChange(e: React.ChangeEvent<HTMLInputElement>): void;
  onNiconicoPasswordChange(e: React.ChangeEvent<HTMLInputElement>): void;
  onWorkingFolderPathChange(e: React.ChangeEvent<HTMLInputElement>): void;
  onYoutubeAuthenticateClick(e: React.MouseEvent<HTMLInputElement>): void;
  onNiconicoURLAdd(value: string): void;
}

export default class Root extends React.Component<Props> {
  render() {
    return (
      <div style={{ cursor: 'default', userSelect: 'none' }}>
        <Configuration {...this.props.configuration} {...this.props} />
        <TextAdd style={{ marginTop: '60px' }} onAddClick={this.props.onNiconicoURLAdd} />
        <TextField disabled fullWidth={true} value={this.props.taskList.message} />
        <TextField
          disabled
          error
          multiline
          fullWidth={true}
          value={[...this.props.taskList.errors].reverse().join('\n')}
          style={{
            overflow: 'scroll',
            display: this.props.taskList.errors.length <= 0 ? 'none' : null,
          }}
        />
      </div>
    );
  }
}
