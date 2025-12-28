// globally store last arrivals (will be 0 to 3 items, usually 3)
let arrivals = [];

// really basic rate limiting
let lastFetch = 0;

// utils //

const createWithClass = (tag, className) => {
  const elem = document.createElement(tag);
  elem.classList.add(className);
  return elem;
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
  arrivals = [];
  document.getElementById("arrivals-list").innerHTML = "";
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

// main logic //

const performFetch = async () => {
  if (!getApiKey()) return onFetchError();

  if (Date.now() - lastFetch < 10000) return; // 10s

  const key = getApiKey();

  try {
    const res = await fetch(
      `https://api.511.org/transit/StopMonitoring?api_key=${key}&agency=SF&stopcode=17145`
    );
    if (!res.ok) throw new Error("couldn't fetch");
    const jsonResponse = await res.json();
    const parsed = jsonResponse["ServiceDelivery"]["StopMonitoringDelivery"][
      "MonitoredStopVisit"
    ].map((x) => {
      return {
        id: x["MonitoredVehicleJourney"]["VehicleRef"] ?? "--",
        arrival:
          x["MonitoredVehicleJourney"]["MonitoredCall"]["ExpectedArrivalTime"],
      };
    });
    arrivals = parsed;
    lastFetch = Date.now();
  } catch (e) {
    onFetchError();
  }
};

const updateTimes = () => {
  const listElem = document.getElementById("arrivals-list");
  listElem.innerHTML = "";
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

    // fetch new data only when needed
    if (minutesAway + secondsAway < 0) {
      performFetch();
    }

    idElem.textContent = `${arrival.id}`;
    inElem.textContent = `${minutesAway}m ${secondsAway}s`;
    atElem.textContent = `(${arrivalTime.toLocaleTimeString()})`;
    listElem.appendChild(containerElem);
  }
};

const updateClock = () => {
  var display = new Date().toLocaleTimeString();
  document.getElementById("time").innerHTML = display;
  setTimeout(updateClock, 1000);
};

const tick = () => {
  updateClock();
  updateTimes();
  const delay = 1000 - (Date.now() % 1000);
  setTimeout(tick, delay);
};

const handleApiKeySubmit = (e) => {
  e.preventDefault();
  const key = document.getElementById("api-key-input").value.trim();
  if (key) {
    setApiKey(key);
    onApiKeySuccess();
  }
};

const setup = () => {
  document.getElementById("api-key-form").addEventListener("submit", (e) => {
    handleApiKeySubmit(e);
  });

  if (!getApiKey()) {
    onFetchError();
  }
  tick();
  performFetch();
};

document.addEventListener("DOMContentLoaded", () => {
  setup();
});
