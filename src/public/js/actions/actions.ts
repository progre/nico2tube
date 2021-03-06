export const SET_NICONICO_EMAIL = 'SET_NICONICO_EMAIL';
export function setNiconicoEmail(email: string) {
  return { type: SET_NICONICO_EMAIL, payload: email };
}

export const SET_NICONICO_PASSWORD = 'SET_NICONICO_PASSWORD';
export function setNiconicoPassword(password: string) {
  return { type: SET_NICONICO_PASSWORD, payload: password };
}

export const SET_WORKING_FOLDER_PATH = 'SET_WORKING_FOLDER_PATH';
export function setWorkingFolderPath(path: string) {
  return { type: SET_WORKING_FOLDER_PATH, payload: path };
}

export const CLEAR_URL = 'CLEAR_URL';
export function clearURL() {
  return { type: CLEAR_URL };
}

export const SET_MESSAGE = 'SET_MESSAGE';
export function setMessage(message: string) {
  return { type: SET_MESSAGE, payload: message };
}

export const ADD_ERROR = 'ADD_ERROR';
export function addError(message: string) {
  return { type: ADD_ERROR, payload: message };
}
