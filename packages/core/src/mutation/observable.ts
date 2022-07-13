import { Observable } from "rxjs";
import { MutationObservableOptions, MutationResponse } from "./model";
import { Mutation } from "./mutation";

export class MutationObservable<T = unknown> extends Observable<
  MutationResponse<T>
> {
  private mutation?: Mutation<T>;
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
      this.mutation = mutation;

      if (typeof options.onSubscribe === "function") {
        options.onSubscribe(mutation.getMutationContext());
      }

      if (options.mutateOnInit === true) {
        mutation.mutate();
      }

      return () => {
        if (typeof options.onUnsubscribe === "function") {
          options.onUnsubscribe(mutation.getMutationContext());
        }
        mutation.cancel();
        subscriber.complete();
      };
    });
  }

  public get value() {
    return this.mutation;
  }
}
