import { xxHash32 } from "js-xxhash";
import localForage from "localforage";
import { WEBSQL, INDEXEDDB, LOCALSTORAGE } from "localforage";
import * as memoryDriver from "localforage-driver-memory";
import * as sessionDriver from "localforage-sessionstoragewrapper";

localForage.defineDriver(memoryDriver);
localForage.defineDriver(sessionDriver);

type Primitives = string | number | boolean;
type PrimitiveObject = {
  [key: string]:
    | PrimitiveObject
    | Primitives
    | PrimitiveObject[]
    | Primitives[];
};
export type StorageKey =
  | PrimitiveObject[]
  | PrimitiveObject
  | Primitives
  | Primitives[];

export type LocalForageInstance = ReturnType<typeof localForage.createInstance>;
export const LocalForageDrivers = {
  LOCALSTORAGE: LOCALSTORAGE,
  SESSIONSTORAGE: sessionDriver._driver,
  MEMORY: memoryDriver._driver,
  WEBSQL: WEBSQL,
  INDEXEDDB: INDEXEDDB,
};

export const setStorageData = <T = unknown>(
  storage: LocalForageInstance,
  hash: string,
  data: T
) => {
  return storage.setItem(hash, data);
};

export const getStorageData = <T = unknown>(
  storage: LocalForageInstance,
  hash: string
) => {
  return storage.getItem<T>(hash);
};

export const encodeKey = (key: StorageKey): string => {
  return xxHash32(JSON.stringify(key)).toString(16);
};
