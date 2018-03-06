import i18next from 'i18next';
import { Button, TextField } from 'material-ui';
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
  onRetryClick(e: React.MouseEvent<HTMLInputElement>): void;
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
          value={
            [
              ...this.props
                .taskList
                .errors
                .map(internationalizeErrorMessage),
            ]
              .reverse().join('\n')
          }
          style={{
            overflow: 'scroll',
            display: this.props.taskList.errors.length <= 0 ? 'none' : null,
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <Button
            variant="raised"
            style={{ display: 'inline-block', marginTop: '1em' }}
            onClick={this.props.onRetryClick}
          >
            Retry
        </Button>
        </div>
      </div>
    );
  }
}

function internationalizeErrorMessage(message: string) {
  const m = /(.+)(: .+)/.exec(message);
  if (m == null) {
    return message;
  }
  return `${i18next.t(m[1])}${m[2]}`;
}
