import { Observable } from "rxjs";
import { QueryFn, QueryOptions, QueryResponse, StorageKey } from "./model";
import { LocalForageInstance } from "./storage";
import { Query } from "./query";

export class QueryObservable<T = any> extends Observable<QueryResponse<T>> {
  constructor(storage: LocalForageInstance, key: StorageKey, queryFn: QueryFn<T>, options: QueryOptions<T>) {
    super(observer => {
      if (typeof options.onSubscribe === 'function') {
        options.onSubscribe(null)
      }

      const query = new Query(observer, storage, { ...options, key, queryFn });

      query.run()

      return () => {
        if (typeof options.onUnsubscribe === 'function') {
          options.onUnsubscribe(null)
        }
        query.cancel();
        observer.complete();
      }
    });
  }
}