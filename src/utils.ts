export const createWithClass = (tag: string, className: string) => {
  const elem = document.createElement(tag);
  elem.classList.add(className);
  return elem;
};

/**
 * from https://stackoverflow.com/a/196991
 * converts aaa bbb -> Aaa Bbb and aaa-bbb to Aaa-Bbb
 * also converts AAA BBB -> Aaa Bbb, etc.
 */
export const toTitleCase = (str: string) => {
  return str.replace(
    /([^\W_]+[^\s-]*) */g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
};

export const forceGetById = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element: ${id}`);
  }
  return el as T;
};

export const createKeyError = () => {
  const elem = createWithClass("p", "key-error");
  elem.textContent = "Please set a valid API key.";
  return elem;
};
