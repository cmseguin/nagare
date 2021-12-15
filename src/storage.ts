import localForage from "localforage";
import { WEBSQL, INDEXEDDB, LOCALSTORAGE } from "localforage";
import * as memoryDriver from "localforage-driver-memory";
import * as sessionDriver from "localforage-sessionstoragewrapper";

localForage.defineDriver(memoryDriver);
localForage.defineDriver(sessionDriver);

export type LocalForageInstance = ReturnType<typeof localForage.createInstance>;
export const LocalForageDrivers = {
  LOCALSTORAGE: LOCALSTORAGE,
  SESSIONSTORAGE: sessionDriver._driver,
  MEMORY: memoryDriver._driver,
  WEBSQL: WEBSQL,
  INDEXEDDB: INDEXEDDB,
};
