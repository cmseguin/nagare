import localForage from "localforage";
import { Observable } from "rxjs";
import {
  QueryClientOptions,
  QueryFn,
  QueryOptions,
  QueryResponse,
  StorageKey,
} from "../model";
import { QueryObservable } from "./observable";
import { xxHash32 } from "js-xxhash";
import { LocalForageDrivers, LocalForageInstance } from "../storage";

export class QueryClient {
  private storageId: string;
  public readonly storage: LocalForageInstance;

  constructor(options: QueryClientOptions = {}) {
    this.storageId = options.storageId ?? `query-client-${this.generateUid()}`;
    this.storage = localForage.createInstance({
      driver: [options.storageDriver ?? LocalForageDrivers.MEMORY],
      name: this.storageId,
      storeName: this.storageId,
    });
  }

  public query<T = unknown>(
    options: QueryOptions<T>
  ): Observable<QueryResponse<T>>;
  public query<T = unknown>(
    key: StorageKey,
    options?: QueryOptions<T>
  ): Observable<QueryResponse<T>>;
  public query<T = unknown>(
    key: StorageKey,
    queryFn: QueryFn<T>,
    options?: QueryOptions<T>
  ): Observable<QueryResponse<T>>;
  public query<T = unknown>(
    arg0: StorageKey | QueryOptions<T>,
    arg1?: QueryFn<T> | QueryOptions<T> | QueryOptions<T>,
    arg2?: QueryOptions<T>
  ): Observable<QueryResponse<T>> {
    // Grab arguments from params
    const options = (
      arg2 ? arg2 : typeof arg1 === "object" ? arg1 : arg0
    ) as QueryOptions<T>;
    const queryFn = typeof arg1 === "function" ? arg1 : options?.queryFn;
    const key = typeof arg0 === "string" ? arg0 : options?.key;

    return new QueryObservable(this.storage, {
      key,
      queryFn,
      ...options,
    });
  }

  private generateUid(): string {
    return xxHash32(Math.random().toString(36)).toString(16);
  }
}
