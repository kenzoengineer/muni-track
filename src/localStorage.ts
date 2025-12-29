const API_LOCAL_STORE_KEY = "511-key";
export const getApiKey = () => {
  return localStorage.getItem(API_LOCAL_STORE_KEY);
};
export const setApiKey = (key: string) => {
  localStorage.setItem(API_LOCAL_STORE_KEY, key);
};

const STOP_CODE_KEY = "stopcode";
export const getStopCode = () => {
  return localStorage.getItem(STOP_CODE_KEY) || "15726"; // default stop code;
};
export const setStopCode = (stop: string) => {
  localStorage.setItem(STOP_CODE_KEY, stop);
};
