import { Subscriber } from "rxjs";
import { NagareClient } from "../client";
import { LocalForageInstance, StorageKey } from "../storage";

export type QueryFn<T = unknown> = (context: QueryContext<T>) => Promise<T>;

export enum QueryCycle {
  INITIAL = "initial",
  START = "start",
  END = "end",
  PRE_FETCH = "pre-fetch",
  POST_CACHE_POPULATION = "post-cache-population",
  ON_STALE = "on-stale",
}

export interface QueryClientOptions {
  storageId?: string;
  storageDriver?: string;
}

export interface QueryResponse<T = unknown> {
  queryKey: StorageKey;
  data: T | undefined;
  error: unknown | undefined;
  isIdle: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  fromCache: boolean;
  isError: boolean;
  isRefresh: boolean;
  isStale: boolean;
  cycle: QueryCycle;
  createdAt: number | undefined;
  updatedAt: number | undefined;
  refresh: () => Promise<void>;
  cancel: () => void;
}

export type QueryMethodOptions<T = unknown> = Partial<
  Omit<QueryObservableOptions<T>, "client">
>;

export type QueryObservableOptions<T = unknown> = Omit<
  QueryOptions<T>,
  "subscriber"
> & {
  onSubscribe?: (context: QueryContext<T>) => void;
  onUnsubscribe?: (context: QueryContext<T>) => void;
};

export interface QueryOptions<T = unknown> {
  queryKey: StorageKey;
  queryFn: QueryFn<T>;
  client: NagareClient;
  subscriber: Subscriber<QueryResponse<T>>;
  storage?: LocalForageInstance;
  cacheTime?: number;
  staleTime?: number;
  staleCheckInterval?: number;
  observe?: Omit<keyof QueryResponse<T>, "refresh" & "cancel">[];
  onSuccess?: (context: QueryContext<T>, data: T) => void;
  onError?: (context: QueryContext<T>, error: unknown) => void;
  onCancel?: (context: QueryContext<T>) => void;
}

export interface QueryContext<T = unknown> {
  queryKey: StorageKey;
  observer: Subscriber<QueryResponse<T>>;
  signal: AbortSignal;
  options: QueryOptions<T>;
}
