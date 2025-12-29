// taken from https://en.wikipedia.org/wiki/Module:Adjacent_stations/MUNI
const MUNI_MAP = {
  E: "#666666",
  F: "#f0e68c",
  J: "#e18813",
  K: "#549dbf",
  L: "#932290",
  M: "#008851",
  N: "#004988",
  S: "#ffcc00",
  T: "#d40843",
};

/**
 *  example object
 * {
 *   1: {
 *     publishedLineName: "CALIFORNIA",
 *     arrivals: [{id: 5811, arrival: 2025-12-28T22:51:23Z}, {...}]
 *   }
 * }
 */

// global store

let store = {};
let pause = false;

// really basic rate limiting
let lastFetch = 0;

// utils //

const createWithClass = (tag, className) => {
  const elem = document.createElement(tag);
  elem.classList.add(className);
  return elem;
};

/**
 * from https://stackoverflow.com/a/196991
 * converts aaa bbb -> Aaa Bbb and aaa-bbb to Aaa-Bbb
 * also converts AAA BBB -> Aaa Bbb, etc.
 */
const toTitleCase = (str) => {
  return str.replace(
    /([^\W_]+[^\s-]*) */g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
};

const createKeyError = () => {
  const elem = createWithClass("p", "key-error");
  elem.textContent = "Please set a valid API key.";
  return elem;
};

const onApiKeySuccess = () => {
  performFetch();
  document.getElementById("api-key-input").value = "";
  document.getElementById("api-key-form").classList.add("hidden");
  document.getElementById("errors").innerHTML = "";
};

const onFetchError = () => {
  store = {};
  document.getElementById("all-arrivals").innerHTML = "";
  document.getElementById("errors").innerHTML = "";
  document.getElementById("errors").appendChild(createKeyError());
  document.getElementById("api-key-form").classList.remove("hidden");
};

// local storage //

const API_LOCAL_STORE_KEY = "511-key";
const getApiKey = () => {
  return localStorage.getItem(API_LOCAL_STORE_KEY);
};
const setApiKey = (key) => {
  localStorage.setItem(API_LOCAL_STORE_KEY, key);
};

const STOP_CODE_KEY = "stopcode";
const getStopCode = () => {
  return localStorage.getItem(STOP_CODE_KEY) || "14028"; // default stop code;
};
const setStopCode = (stop) => {
  localStorage.setItem(STOP_CODE_KEY, stop);
};

// main logic //

const performFetch = async (force) => {
  if (!getApiKey()) return onFetchError();
  if (Date.now() - lastFetch < 5000 && !force) return; // 5s rate limit

  const key = getApiKey();

  try {
    const res = await fetch(
      `https://api.511.org/transit/StopMonitoring?api_key=${key}&agency=SF&stopcode=${getStopCode()}&format=xml`
    );

    if (!res.ok) throw new Error("couldn't fetch");

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "application/xml");

    // detect API-level XML errors
    if (xml.querySelector("parsererror")) {
      throw new Error("invalid XML");
    }

    store = {}; // reset store

    const visits = xml.querySelectorAll("MonitoredStopVisit");

    Array.from(visits).forEach((visit) => {
      const vehicleRef = visit.querySelector("VehicleRef")?.textContent || "--";
      const lineRef = visit.querySelector("LineRef")?.textContent ?? "?"; // yeah im using ? as a key so what
      const publishedLineName =
        visit.querySelector("PublishedLineName")?.textContent ?? "Unknown";
      const arrivalTime =
        visit.querySelector("MonitoredCall > ExpectedArrivalTime")
          ?.textContent ||
        visit.querySelector("MonitoredCall > ExpectedDepartureTime")
          ?.textContent;
      if (!store[lineRef]) {
        store[lineRef] = {
          publishedLineName: toTitleCase(publishedLineName),
          arrivals: [{ id: vehicleRef, arrival: arrivalTime }],
        };
      } else {
        store[lineRef].arrivals.push({ id: vehicleRef, arrival: arrivalTime });
      }
    });

    lastFetch = Date.now();
  } catch (e) {
    onFetchError();
  }
};

const updateTimes = () => {
  const listElem = document.getElementById("all-arrivals");
  listElem.innerHTML = "";
  for (const lineKey in store) {
    const lineName = store[lineKey].publishedLineName;
    const arrivals = store[lineKey].arrivals;
    if (store[lineKey].arrivals.length === 0) continue;

    const oneLine = createWithClass("div", "line-container");
    const lineTitleContainer = createWithClass("div", "flexbox");
    const lineCircle = createWithClass(
      "h2",
      lineKey.length > 2 ? "circleSmall" : "circle"
    );
    if (MUNI_MAP[lineKey]) {
      lineCircle.style.backgroundColor = MUNI_MAP[lineKey];
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
  document.getElementById("time").textContent = display;
};

const perSecondTick = () => {
  if (!pause) {
    updateClock();
    updateTimes();
  }
  const delay = 1000 - (Date.now() % 1000);
  setTimeout(perSecondTick, delay);
};

const per15SecondsTick = () => {
  if (!pause) {
    performFetch();
  }
  const delay = 15000 - (Date.now() % 15000);
  setTimeout(per15SecondsTick, delay);
};

const handleApiKeySubmit = (e) => {
  e.preventDefault();
  const key = document.getElementById("api-key-input").value.trim();
  if (key) {
    setApiKey(key);
    onApiKeySuccess();
  }
};

const handleStopSubmit = (e) => {
  console.log(e);
  e.preventDefault();
  const _stopCode = document.getElementById("stop-input").value.trim();
  console.log(_stopCode);
  if (_stopCode) {
    setStopCode(_stopCode);
    performFetch(true);
  }
};

const setup = () => {
  // prepopulate stop code input
  document.getElementById("stop-input").value = getStopCode();
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
    .getElementById("api-key-form")
    .addEventListener("submit", (e) => handleApiKeySubmit(e));
  document
    .getElementById("refresh")
    .addEventListener("click", () => performFetch(true));
  document
    .getElementById("clear-api")
    .addEventListener("click", () => setApiKey(""));
  document.getElementById("pause").addEventListener("click", () => {
    pause = !pause;
    document.getElementById("pause").textContent = pause ? "Resume" : "Pause";
  });
  document
    .getElementById("stop-form")
    .addEventListener("submit", (e) => handleStopSubmit(e));
});
