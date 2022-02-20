import { Observable } from "rxjs";
import { MutationObservableOptions } from "./model";
import { Mutation } from "./mutation";

export class MutationObservable<T = unknown> extends Observable<unknown> {
  constructor(options: MutationObservableOptions<T>) {
    const { mutationKey, mutationFn, client } = options;

    if (!client) {
      throw new Error("Client not provided");
    }

    // Handle no mutation function
    if (!mutationFn) {
      throw new Error("Mutation function not provided");
    }

    super((subscriber) => {
      const mutation = new Mutation({
        ...options,
        client,
        subscriber,
        mutationKey,
        mutationFn,
      });

      if (typeof options.onSubscribe === "function") {
        options.onSubscribe(mutation.getMutationContext());
      }

      mutation.mutate();

      return () => {
        if (typeof options.onUnsubscribe === "function") {
          options.onUnsubscribe(mutation.getMutationContext());
        }
        mutation.cancel();
        subscriber.complete();
      };
    });
  }
}
