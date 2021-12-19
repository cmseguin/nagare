import { Subscriber } from "rxjs";
import { filter, tap } from "rxjs/operators";
import { NagareClient } from "../client";
import { NotificationEvent, NotificationType } from "../model";
import { encodeKey, StorageKey } from "../storage";
import {
  MutationContext,
  MutationFn,
  MutationOptions,
  MutationResponse,
} from "./model";

export class Mutation<T = unknown> {
  private mutationKey: StorageKey;
  private mutationFn: MutationFn<T>;
  private subscriber: Subscriber<MutationResponse<T>>;
  private client: NagareClient;
  private abortController = new AbortController();

  constructor(private options: MutationOptions<T>) {
    this.mutationKey = this.options.mutationKey;
    this.mutationFn = this.options.mutationFn;
    this.client = this.options.client;
    this.subscriber = this.options.subscriber;

    this.notifications$Handler();
  }

  public async mutate(): Promise<T> {
    if (typeof this.options.onMutate === "function") {
      this.options.onMutate(this.getMutationContext());
    }

    try {
      const data = await this.mutationFn(this.getMutationContext());

      if (typeof this.options.onSuccess === "function") {
        this.options.onSuccess(this.getMutationContext(), data);
      }

      return data;
    } catch (error) {
      if (typeof this.options.onError === "function") {
        this.options.onError(this.getMutationContext(), error);
      }

      throw error;
    }
  }

  public async cancel(): Promise<void> {
    this.abortController.abort();

    if (typeof this.options.onCancel === "function") {
      this.options.onCancel(this.getMutationContext());
    }
  }

  public getMutationContext(): MutationContext<T> {
    return {
      observer: this.subscriber,
      options: this.options,
    };
  }

  private notifications$Handler() {
    const sub = this.client.notifications$
      .pipe(
        // Only look for notifications addressed to this mutation
        filter(
          ({ key }) =>
            (!!key && encodeKey(key) === encodeKey(this.mutationKey)) || !key
        ),
        tap((event) => this.notificationReducer(event))
      )
      .subscribe();

    this.subscriber.add(() => {
      sub.unsubscribe();
    });
  }

  private notificationReducer(event: NotificationEvent) {
    switch (event.type) {
      case NotificationType.mutationCancel:
        return this.cancel();
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  }
}
