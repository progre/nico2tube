import * as React from 'react';
import { default as ConfigurationDomain } from '../../../domain/Configuration';
import Configuration from './Configuration';
import ErrorList from './ErrorList';
import TaskList from './TaskList';

export interface Props {
  configuration: ConfigurationDomain;
  taskList: {
    tasks: ReadonlyArray<string>;
    errors: ReadonlyArray<string>;
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
      <>
        <Configuration {...this.props.configuration} {...this.props} />
        <TaskList
          tasks={this.props.taskList.tasks}
          onAddClick={this.props.onNiconicoURLAdd}
        />
        <ErrorList errors={this.props.taskList.errors} />
      </>
    );
  }
}
