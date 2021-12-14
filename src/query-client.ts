import localForage from "localforage";
import { Observable } from "rxjs";
import { QueryFn, QueryOptions, QueryResponse, StorageKey } from "./model";
import { QueryObservable } from "./query-observable";
import { LocalForageDrivers, LocalForageInstance } from "./storage";

export class QueryClient {
  public readonly storage: LocalForageInstance;

  constructor() {
    this.storage = localForage.createInstance({
      driver: [LocalForageDrivers.MEMORY],
      name: 'query-client'
    });
  }

  public query<T = unknown>(options: QueryOptions<T>): Observable<QueryResponse<T>>
  public query<T = unknown>(key: StorageKey, options?: QueryOptions<T>): Observable<QueryResponse<T>>
  public query<T = unknown>(key: StorageKey, queryFn: QueryFn<T>, options?: QueryOptions<T>): Observable<QueryResponse<T>>
  public query<T = unknown>(
    arg0: StorageKey | QueryOptions<T>, 
    arg1?: QueryFn<T> | QueryOptions<T> | QueryOptions<T>, 
    arg2?: QueryOptions<T>
  ): Observable<QueryResponse<T>> {
    // Grab arguments from params
    const options = (arg2 ? arg2 : typeof arg1 === 'object' ? arg1 : arg0) as QueryOptions<T>
    const queryFn = typeof arg1 === 'function' ? arg1 : options?.queryFn;
    const key = typeof arg0 === 'string' ? arg0 : options?.key;

    // Handle no query function
    if (!queryFn) {
      throw new Error('Query function not provided');
    }

    // Handle no key
    if (!key) {
      throw new Error('Key not provided');
    }

    return new QueryObservable(this.storage, key, queryFn, options);
  }
}