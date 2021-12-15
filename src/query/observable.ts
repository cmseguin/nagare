import { Observable } from "rxjs";
import { QueryOptions, QueryResponse } from "../model";
import { LocalForageInstance } from "../storage";
import { Query } from "./query";

export class QueryObservable<T = any> extends Observable<QueryResponse<T>> {
  constructor(storage: LocalForageInstance, options: QueryOptions<T>) {
    const { key, queryFn } = options;

    if (!storage) {
      throw new Error("Storage not provided");
    }

    // Handle no query function
    if (!queryFn) {
      throw new Error("Query function not provided");
    }

    // Handle no key
    if (!key) {
      throw new Error("Key not provided");
    }

    super((observer) => {
      if (typeof options.onSubscribe === "function") {
        options.onSubscribe(null);
      }

      const query = new Query(observer, storage, { ...options, key, queryFn });

      query.run();

      return () => {
        if (typeof options.onUnsubscribe === "function") {
          options.onUnsubscribe(null);
        }
        query.cancel();
        observer.complete();
      };
    });
  }
}
