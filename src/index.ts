import { onApiKeySuccess, onFetchError, performFetch } from "./api";
import { MUNI_MAP } from "./consts";
import globals from "./globals";
import { getApiKey, getStopCode, setApiKey, setStopCode } from "./localStorage";
import { createWithClass, forceGetById } from "./utils";

const updateTimes = () => {
  const listElem = document.getElementById("all-arrivals");
  if (!listElem) return;

  listElem.innerHTML = "";
  for (const lineKey in globals.store) {
    const lineName = globals.store[lineKey].publishedLineName;
    const arrivals = globals.store[lineKey].arrivals;
    if (globals.store[lineKey].arrivals.length === 0) continue;

    const oneLine = createWithClass("div", "line-container");
    const lineTitleContainer = createWithClass("div", "flexbox");
    const lineCircle = createWithClass(
      "h2",
      lineKey.length > 2 ? "circleSmall" : "circle"
    );
    if (lineKey in MUNI_MAP) {
      lineCircle.style.backgroundColor =
        MUNI_MAP[lineKey as keyof typeof MUNI_MAP];
    }
    lineCircle.textContent = lineKey;
    const title = createWithClass("h2", "line-title");
    title.textContent = lineName;
    lineTitleContainer.appendChild(lineCircle);
    lineTitleContainer.appendChild(title);
    oneLine.appendChild(lineTitleContainer);
    for (const arrival of arrivals) {
      const containerElem = createWithClass("div", "arrival-container");
      const idElem = createWithClass("p", "arrival-id");
      const infoElem = createWithClass("div", "arrival-info-container");
      const inElem = createWithClass("p", "arrival-in");
      const atElem = createWithClass("p", "arrival-at");

      infoElem.appendChild(inElem);
      infoElem.appendChild(atElem);
      containerElem.appendChild(idElem);
      containerElem.appendChild(infoElem);

      const arrivalTime = new Date(arrival.arrival);
      const now = new Date();
      const minutesAway = Math.floor(
        (arrivalTime.getTime() - now.getTime()) / 60000
      );
      const secondsAway =
        Math.floor((arrivalTime.getTime() - now.getTime()) / 1000) % 60;

      if (minutesAway < 2) {
        containerElem.classList.add("imminent");
      } else {
        containerElem.classList.remove("imminent");
      }

      // fetch new data when a transit vehicle leaves
      if (minutesAway + secondsAway < 0) {
        performFetch(true);
      }

      idElem.textContent = `${arrival.id}`;
      if (minutesAway < 0 || (minutesAway === 0 && secondsAway <= 0)) {
        inElem.textContent = `Arriving`;
        atElem.textContent = `(${arrivalTime.toLocaleTimeString()})`;
      } else {
        inElem.textContent = `${minutesAway}m ${secondsAway}s`;
        atElem.textContent = `(${arrivalTime.toLocaleTimeString()})`;
      }
      oneLine.appendChild(containerElem);
    }
    listElem.appendChild(oneLine);
  }
};

const updateClock = () => {
  var display = new Date().toLocaleTimeString();
  forceGetById<HTMLHeadingElement>("time").textContent = display;
};

const perSecondTick = () => {
  if (!globals.pause) {
    updateClock();
    updateTimes();
  }
  const delay = 1000 - (Date.now() % 1000);
  setTimeout(perSecondTick, delay);
};

const per15SecondsTick = () => {
  if (!globals.pause) {
    performFetch();
  }
  const delay = 15000 - (Date.now() % 15000);
  setTimeout(per15SecondsTick, delay);
};

const handleApiKeySubmit = (e: Event) => {
  e.preventDefault();
  const key = forceGetById<HTMLInputElement>("api-key-input").value.trim();
  if (key) {
    setApiKey(key);
    onApiKeySuccess();
  }
};

const handleStopSubmit = (e: Event) => {
  console.log(e);
  e.preventDefault();
  const _stopCode = forceGetById<HTMLInputElement>("stop-input").value.trim();
  console.log(_stopCode);
  if (_stopCode) {
    setStopCode(_stopCode);
    performFetch(true);
  }
};

const setup = () => {
  // prepopulate stop code input
  forceGetById<HTMLInputElement>("stop-input").value = getStopCode();
  // ensure api key
  if (!getApiKey()) {
    onFetchError();
  }
  // set up tickers
  perSecondTick();
  per15SecondsTick();
  performFetch();
};

document.addEventListener("DOMContentLoaded", () => {
  setup();
  document
    ?.getElementById("api-key-form")
    ?.addEventListener("submit", (e) => handleApiKeySubmit(e));
  document
    ?.getElementById("refresh")
    ?.addEventListener("click", () => performFetch(true));
  document
    ?.getElementById("clear-api")
    ?.addEventListener("click", () => setApiKey(""));
  document
    ?.getElementById("stop-form")
    ?.addEventListener("submit", (e) => handleStopSubmit(e));
});
