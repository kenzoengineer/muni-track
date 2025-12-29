import globals from "./globals";
import { getApiKey, getStopCode } from "./localStorage";
import { createKeyError, forceGetById, toTitleCase } from "./utils";

export const onApiKeySuccess = () => {
  performFetch();
  forceGetById<HTMLInputElement>("api-key-input").value = "";
  forceGetById<HTMLFormElement>("api-key-form").classList.add("hidden");
  forceGetById<HTMLDivElement>("errors").innerHTML = "";
};

export const onFetchError = () => {
  globals.store = {};
  forceGetById<HTMLDivElement>("all-arrivals").innerHTML = "";
  forceGetById<HTMLDivElement>("errors").innerHTML = "";
  forceGetById<HTMLDivElement>("errors").appendChild(createKeyError());
  forceGetById<HTMLFormElement>("api-key-form").classList.remove("hidden");
};
export const performFetch = async (force: boolean = false) => {
  if (!getApiKey()) return onFetchError();
  if (Date.now() - globals.lastFetch < 15000 && !force) return; // 15s rate limit

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

    globals.store = {}; // reset store

    const visits = xml.querySelectorAll("MonitoredStopVisit");

    Array.from(visits).forEach((visit) => {
      const vehicleRef = visit.querySelector("VehicleRef")?.textContent || "--";
      const lineRef = visit.querySelector("LineRef")?.textContent ?? "?"; // yeah im using ? as a key so what
      const publishedLineName =
        visit.querySelector("PublishedLineName")?.textContent ?? "Unknown";
      const arrivalTime =
        (visit.querySelector("MonitoredCall > ExpectedArrivalTime")
          ?.textContent ||
          visit.querySelector("MonitoredCall > ExpectedDepartureTime")
            ?.textContent) ??
        "";
      if (!globals.store[lineRef]) {
        globals.store[lineRef] = {
          publishedLineName: toTitleCase(publishedLineName),
          arrivals: [{ id: vehicleRef, arrival: arrivalTime }],
        };
      } else {
        globals.store[lineRef].arrivals.push({
          id: vehicleRef,
          arrival: arrivalTime,
        });
      }
    });

    globals.lastFetch = Date.now();
  } catch (e) {
    onFetchError();
  }
};
