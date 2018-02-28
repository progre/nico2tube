export const initialState = {
  stateVersion: 1,
  configuration: {
    niconicoEmail: '',
    niconicoPassword: '',
    niconicoNoEconomy: true,
    workingFolderPath: '',
  },
  taskList: {
    tasks: <ReadonlyArray<string>>[],
    errors: <ReadonlyArray<string>>[],
    messsage: '',
  },
};

export interface State {
  readonly configuration: ConfigurationState;
  readonly taskList: TaskListState;
}

export type ConfigurationState = typeof initialState.configuration;
export type TaskListState = typeof initialState.taskList;

export function createInitialState(storedState: any): State {
  if (storedState == null) {
    return initialState;
  }
  if (storedState.stateVersion === initialState.stateVersion) {
    return {
      ...storedState,
      taskList: {
        tasks: [],
        errors: [],
      },
    };
  }
  return migrate(storedState);
}

function migrate(state: any) {
  return migrate0to1(state);
}

function migrate0to1(_: any) {
  return initialState;
}
