import { LocalForageInstance } from "./storage";

type Primitives = string | number | boolean;
type PrimitiveObject = { [key: string]: PrimitiveObject | Primitives | PrimitiveObject[] | Primitives[] }
export type StorageKey = PrimitiveObject[] | PrimitiveObject | Primitives | Primitives[];
export interface StorageItem<T = any> {
  data: T;
  updatedAt: number;
  expiresAt: number;
  stalesAt: number
}

export type QueryFn<T> = (context: any) => Promise<T>
export enum QueryCycle {
  START = 'start',
  END = 'end',
  PRE_FETCH = 'pre-fetch',
  POST_CACHE_POPULATION = 'post-cache-population',
  ON_STALE = 'on-stale',
}

export interface QueryResponse<T> {
  key: StorageKey
  hash: string
  data: T | undefined
  error: unknown | undefined
  isIdle: boolean
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  fromCache: boolean
  isError: boolean
  isRefresh: boolean
  isStale: boolean
  cycle: QueryCycle
  createdAt: number | undefined
  updatedAt: number | undefined
  refresh: () => Promise<void>
  cancel: () => void
}

export interface QueryOptions<T> {
  key?: StorageKey
  storage?: LocalForageInstance
  cacheTime?: number
  staleTime?: number
  observe?: Omit<keyof QueryResponse<T>, 'refresh' & 'cancel'>[]
  queryFn?: QueryFn<T>
  onSuccess?: (context: any) => void
  onError?: (context: any) => void
  onCancel?: (context: any) => void
  onSubscribe?: (context: any) => void
  onUnsubscribe?: (context: any) => void
}