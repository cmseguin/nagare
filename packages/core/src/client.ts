import localForage from "localforage";
import { QueryClientOptions, QueryFn, QueryMethodOptions } from "./query/model";
import { QueryObservable } from "./query/observable";
import { xxHash32 } from "js-xxhash";
import {
  encodeKey,
  LocalForageDrivers,
  LocalForageInstance,
  StorageKey,
} from "./storage";
import { NagareClientInterface } from "./client.interface";
import { NotificationEvent, NotificationType, StorageItem } from "./model";
import { MutationFn, MutationMethodOptions } from "./mutation/model";
import { MutationObservable } from "./mutation/observable";
import { Subject } from "rxjs";

export class NagareClient implements NagareClientInterface {
  private storageId?: string;
  private storage?: LocalForageInstance;

  public notifications$ = new Subject<NotificationEvent>();

  constructor(private options: QueryClientOptions = {}) {
    this.generateStorage();
  }

  public query<T = unknown>(
    arg0: QueryMethodOptions<T> | StorageKey,
    arg1?: QueryMethodOptions<T> | QueryFn<T>,
    arg2?: QueryMethodOptions<T>
  ) {
    // Grab arguments from params
    const { queryKey, queryFn, options } = this.getQueryArgs(arg0, arg1, arg2);

    if (typeof queryKey === "undefined") {
      throw new Error("Key not provided");
    }

    if (typeof queryFn !== "function") {
      throw new Error("Query function is invalid");
    }

    return new QueryObservable({
      ...options,
      client: this,
      queryKey,
      queryFn,
    });
  }

  public mutation<T = unknown>(
    arg0: MutationMethodOptions<T> | StorageKey,
    arg1?: MutationMethodOptions<T> | MutationFn<T>,
    arg2?: MutationMethodOptions<T>
  ) {
    const { mutationKey, mutationFn, options } = this.getMutationArgs(
      arg0,
      arg1,
      arg2
    );

    if (typeof mutationKey === "undefined") {
      throw new Error("Key not provided");
    }

    if (typeof mutationFn !== "function") {
      throw new Error("Mutation function is invalid");
    }

    return new MutationObservable({
      ...options,
      client: this,
      mutationKey,
      mutationFn,
    });
  }

  public cancelAllQueries() {
    this.notifications$.next({
      type: NotificationType.queryCancel,
    });
  }

  public cancelQuery(key: StorageKey) {
    this.notifications$.next({
      key,
      type: NotificationType.queryCancel,
    });
  }

  public cancelAllMutations() {
    this.notifications$.next({
      type: NotificationType.mutationCancel,
    });
  }

  public cancelMutation(key: StorageKey) {
    this.notifications$.next({
      key,
      type: NotificationType.mutationCancel,
    });
  }

  public async setCacheData<T = unknown>(
    key: StorageKey,
    data: T,
    options?: { staleTime?: number; cacheTime?: number }
  ) {
    if (!this.storage) {
      throw new Error("Storage undefined");
    }

    const hash = encodeKey(key);
    const storageItem = {
      data,
      expiresAt: Date.now() + (options?.cacheTime ?? 0),
      stalesAt: Date.now() + (options?.staleTime ?? 0),
      updatedAt: Date.now(),
    } as StorageItem<T>;

    await this.storage.setItem(hash, JSON.stringify(storageItem));
    return storageItem;
  }

  public async getCacheData<T = unknown>(
    key: StorageKey
  ): Promise<StorageItem<T> | undefined> {
    if (!this.storage) {
      throw new Error("Storage undefined");
    }

    const hash = encodeKey(key);
    const cacheItem = await this.storage.getItem<string>(hash);

    try {
      const resultFromStorage = JSON.parse(
        cacheItem ?? "null"
      ) as StorageItem<T> | null;

      if (!resultFromStorage) {
        throw new Error("Invalid cache");
      }

      if (
        !resultFromStorage.expiresAt ||
        resultFromStorage.expiresAt < Date.now()
      ) {
        throw new Error("Cache expired");
      }

      return resultFromStorage;
    } catch {
      // ignore for now
    }
  }

  private generateStorage() {
    this.storageId =
      this.options.storageId ?? `query-client-${this.generateUid()}`;
    this.storage = localForage.createInstance({
      driver: [this.options.storageDriver ?? LocalForageDrivers.MEMORY],
      name: this.storageId,
      storeName: this.storageId,
    });
  }

  private getQueryArgs = <T = unknown>(
    arg0: QueryMethodOptions<T> | StorageKey,
    arg1?: QueryMethodOptions<T> | QueryFn<T>,
    arg2?: QueryMethodOptions<T>
  ) => {
    const options = (
      arg2 ? arg2 : typeof arg1 === "object" ? arg1 : arg0
    ) as QueryMethodOptions<T>;
    const queryFn = typeof arg1 === "function" ? arg1 : options?.queryFn;
    const queryKey = typeof arg0 === "string" ? arg0 : options?.queryKey;
    return { options, queryFn, queryKey };
  };

  private getMutationArgs = <T = unknown>(
    arg0: MutationMethodOptions<T> | StorageKey,
    arg1?: MutationMethodOptions<T> | MutationFn<T>,
    arg2?: MutationMethodOptions<T>
  ) => {
    const options = (
      arg2 ? arg2 : typeof arg1 === "object" ? arg1 : arg0
    ) as MutationMethodOptions<T>;
    const mutationFn = typeof arg1 === "function" ? arg1 : options?.mutationFn;
    const mutationKey = typeof arg0 === "string" ? arg0 : options?.mutationKey;
    return { options, mutationFn, mutationKey };
  };

  // TODO: maybe use uuid... might be better
  private generateUid(): string {
    return xxHash32(Math.random().toString(36)).toString(16);
  }
}
