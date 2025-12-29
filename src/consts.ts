// taken from https://en.wikipedia.org/wiki/Module:Adjacent_stations/MUNI
export const MUNI_MAP = {
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

export interface Arrival {
  id: string;
  arrival: string;
}

export interface ArrivalsStore {
  [lineRef: string]: {
    publishedLineName: string;
    arrivals: Arrival[];
  };
}
