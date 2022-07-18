import { Observable } from "rxjs";
import { QueryObservableOptions, QueryResponse } from "./model";
import { Query } from "./query";

export class QueryObservable<T = unknown> extends Observable<QueryResponse<T>> {
  private query?: Query<T>;

  constructor(options: QueryObservableOptions<T>) {
    const { queryKey, queryFn, client } = options;

    if (!client) {
      throw new Error("Client not provided");
    }

    // Handle no query function
    if (!queryFn) {
      throw new Error("Query function not provided");
    }

    // Handle no key
    if (!queryKey) {
      throw new Error("Query Key not provided");
    }

    super((subscriber) => {
      if (typeof options.onSubscribe === "function") {
        options.onSubscribe(query.getQueryContext());
      }

      query.registerSubscriber(subscriber);
      query.run();

      return () => {
        if (typeof options.onUnsubscribe === "function") {
          options.onUnsubscribe(query.getQueryContext());
        }
        query.cancel();
        subscriber.complete();
      };
    });

    const query = new Query({
      ...options,
      queryKey,
      queryFn,
      client,
    });

    this.query = query;
  }

  public get initialResponse() {
    return this.query?.initialResponse;
  }
}
