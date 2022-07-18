import { BehaviorSubject, Subscriber } from "rxjs";
import { filter, tap } from "rxjs/operators";
import { NagareClient } from "../client";
import { NotificationEvent, NotificationType, QueueItem } from "../model";
import { encodeKey, StorageKey } from "../storage";
import {
  MutationContext,
  MutationCycle,
  MutationFn,
  MutationOptions,
  MutationResponse,
} from "./model";

type EmitQueueItem = QueueItem<"emit", () => void>;
type UnmountQueueItem = QueueItem<"unmount", () => void>;
type QueueItems = (EmitQueueItem | UnmountQueueItem)[];

export class Mutation<T = unknown> {
  private data$ = new BehaviorSubject<T | undefined>(undefined);
  private error$ = new BehaviorSubject<unknown | undefined>(undefined);
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private isIdle$ = new BehaviorSubject<boolean>(false);
  private isError$ = new BehaviorSubject<boolean>(false);
  private isSuccess$ = new BehaviorSubject<boolean>(false);

  private options: MutationOptions<T>;
  private mutationKey: StorageKey;
  private mutationFn: MutationFn<T>;
  private subscriber?: Subscriber<MutationResponse<T>>;
  private client: NagareClient;
  private abortController = new AbortController();

  private _lastResponse?: MutationResponse<T>;
  private _initialResponse?: MutationResponse<T>;

  private queue: QueueItems = [];
  private initialized = false;

  constructor(options: MutationOptions<T>) {
    this.options = this.defaultOptions(options);
    this.validateOptions();
    this.mutationKey = this.options.mutationKey;
    this.mutationFn = this.options.mutationFn;
    this.client = this.options.client;

    if (this.options.subscriber) {
      this.subscriber = this.options.subscriber;
    }

    this._initialResponse = this.buildMutationResponse(MutationCycle.INITIAL);
  }

  public get initialResponse() {
    return this._initialResponse;
  }

  public registerSubscriber(subscriber: Subscriber<MutationResponse<T>>) {
    this.subscriber = subscriber;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.payload();
      }
    }
  }

  public async mutate(): Promise<T> {
    this.initialize();

    if (typeof this.options?.onMutate === "function") {
      this.options.onMutate(this.getMutationContext());
    }

    this.emit(MutationCycle.MUTATE);

    this.isLoading$.next(true);
    this.emit(MutationCycle.START);

    try {
      const data = await this.mutationFn(this.getMutationContext());
      this.isLoading$.next(false);
      this.isError$.next(false);
      this.isSuccess$.next(true);
      this.data$.next(data);

      if (typeof this.options.onSuccess === "function") {
        this.options.onSuccess(this.getMutationContext(), data);
      }

      return data;
    } catch (error) {
      this.isSuccess$.next(false);
      this.isError$.next(true);
      this.error$.next(error);

      if (typeof this.options.onError === "function") {
        this.options.onError(this.getMutationContext(), error);
      }

      throw error;
    } finally {
      this.emit(MutationCycle.END);
    }
  }

  public async cancel(): Promise<void> {
    this.abortController.abort();

    if (typeof this.options.onCancel === "function") {
      this.options.onCancel(this.getMutationContext());
    }
  }

  private initialize() {
    if (!this.initialized) {
      if (!this.subscriber) {
        throw new Error("Subscriber is not registered");
      }

      this.notifications$Handler();
    }

    this.initialized = true;
  }

  private defaultOptions(options: MutationOptions<T>): MutationOptions<T> {
    return {
      cacheTime: 5 * 60 * 1000,
      staleTime: 0,
      observe: undefined,
      ...options,
    };
  }

  private buildMutationResponse(cycle: MutationCycle): MutationResponse<T> {
    return {
      mutationKey: this.mutationKey,
      data: this.data$.value,
      error: this.error$.value,
      isIdle: this.isIdle$.value,
      isLoading: this.isLoading$.value,
      isSuccess: this.isSuccess$.value,
      isError: this.isError$.value,
      cycle,
      mutate: () => this.mutate(),
      cancel: () => this.cancel(),
    };
  }

  private emit(cycle: MutationCycle) {
    const response = this.buildMutationResponse(cycle);

    if (!this._lastResponse || !this.options.observe) {
      this.emitOrQueue(response);
    }

    if (this._lastResponse && this.options.observe) {
      const change = Object.entries(response)
        .filter(([key]) => this.options.observe?.includes(key))
        .some(
          ([key, value]) =>
            this._lastResponse?.[key as keyof MutationResponse<T>] !== value
        );

      if (change) {
        this.emitOrQueue(response);
      }
    }

    this._lastResponse = response;
  }

  private emitOrQueue(response: MutationResponse<T>) {
    if (!this.subscriber) {
      this.queue.push({
        type: "emit",
        payload: () => this.subscriber?.next(response),
      });
      return;
    }
    this.subscriber.next(response);
  }

  private unmountOrQueue(handler: () => void) {
    if (!this.subscriber) {
      this.queue.push({
        type: "unmount",
        payload: () => this.subscriber?.add(handler),
      });
      return;
    }
    this.subscriber.add(handler);
  }

  public getMutationContext(): MutationContext<T> {
    return {
      options: this.options,
      signal: this.abortController.signal,
      observer: this.subscriber,
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

    this.unmountOrQueue(() => {
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

  private validateOptions() {
    if (!this.options.client) {
      throw new Error("Mutation requires a client");
    }

    if (!this.options.mutationKey) {
      throw new Error("Mutation key is required");
    }

    if (!this.options.mutationFn) {
      throw new Error("Mutation function is required");
    }
  }
}
