import * as redux from 'redux';
import * as actions from '../actions/actions';
import { ConfigurationState, initialState, State, TaskListState } from '../state';

function configurationReducer(
  state: ConfigurationState = initialState.configuration,
  action: any,
) {
  switch (action.type) {
    case actions.SET_NICONICO_EMAIL:
      return {
        ...state,
        niconicoEmail: action.payload,
      };
    case actions.SET_NICONICO_PASSWORD:
      return {
        ...state,
        niconicoPassword: action.payload,
      };
    case actions.SET_WORKING_FOLDER_PATH:
      return {
        ...state,
        workingFolderPath: action.payload,
      };
    default:
      return state;
  }
}

function taskListReducer(
  state: TaskListState = initialState.taskList,
  action: any,
) {
  switch (action.type) {
    case actions.ADD_ERROR:
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    case actions.SET_QUEUE:
      return {
        ...state,
        tasks: action.payload,
      };
    default:
      return state;
  }
}

export default redux.combineReducers<State>({
  stateVersion: (state: number = 0) => state,
  configuration: configurationReducer,
  taskList: taskListReducer,
});
