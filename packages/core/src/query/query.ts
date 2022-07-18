import {
  BehaviorSubject,
  combineLatest,
  interval,
  Subscriber,
  merge,
} from "rxjs";
import { tap, map, filter } from "rxjs/operators";
import {
  QueryContext,
  QueryCycle,
  QueryFn,
  QueryOptions,
  QueryResponse,
} from "./model";
import { encodeKey, StorageKey } from "../storage";
import { NagareClient } from "../client";
import { NotificationEvent, NotificationType, QueueItem } from "../model";

type EmitQueueItem = QueueItem<"emit", () => void>;
type UnmountQueueItem = QueueItem<"unmount", () => void>;
type QueueItems = (EmitQueueItem | UnmountQueueItem)[];

export class Query<T = unknown> {
  private data$ = new BehaviorSubject<T | undefined>(undefined);
  private error$ = new BehaviorSubject<unknown | undefined>(undefined);
  private isFetching$ = new BehaviorSubject<boolean>(false);
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private isIdle$ = new BehaviorSubject<boolean>(false);
  private isError$ = new BehaviorSubject<boolean>(false);
  private isSuccess$ = new BehaviorSubject<boolean>(false);
  private isRefresh$ = new BehaviorSubject<boolean>(false);
  private fromCache$ = new BehaviorSubject<boolean>(false);
  private isStale$ = new BehaviorSubject<boolean>(true);
  private createdAt$ = new BehaviorSubject<number>(Date.now());
  private updatedAt$ = new BehaviorSubject<number | undefined>(undefined);
  private stalesAt$ = new BehaviorSubject<number | undefined>(undefined);
  private expiresAt$ = new BehaviorSubject<number | undefined>(undefined);

  private queryKey: StorageKey;
  private queryFn: QueryFn<T>;
  private options: QueryOptions<T>;
  private subscriber?: Subscriber<QueryResponse<T>>;
  private client: NagareClient;
  private abortController = new AbortController();

  private _lastResponse?: QueryResponse<T>;
  private _initialResponse?: QueryResponse<T>;

  private queue: QueueItems = [];

  private initialized = false;

  constructor(options: QueryOptions<T>) {
    this.options = this.defaultOptions(options);
    this.validateOptions();
    this.client = this.options.client;
    this.queryFn = this.options.queryFn;
    this.queryKey = this.options.queryKey;

    if (this.options.subscriber) {
      this.registerSubscriber(this.options.subscriber);
    }

    this._initialResponse = this.buildQueryResponse(QueryCycle.INITIAL);
  }

  public async run() {
    this.initialize();
    return this.callQueryFn(false);
  }

  public async refresh() {
    return this.callQueryFn(true);
  }

  public cancel() {
    this.abortController.abort();
    if (typeof this.options.onCancel === "function") {
      this.options.onCancel(this.getQueryContext());
    }
  }

  public registerSubscriber(subscriber: Subscriber<QueryResponse<T>>) {
    this.subscriber = subscriber;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.payload();
      }
    }
  }

  public get initialResponse() {
    return this._initialResponse;
  }

  private initialize() {
    if (!this.initialized) {
      if (!this.subscriber) {
        throw new Error("Subscriber is not registered");
      }

      this.notifications$Handler();
      this.isLoading$Handler();
      this.isStale$Handler();
      this.isIdle$Handler();
    }

    this.initialized = true;
  }

  private async callQueryFn(isRefresh: boolean) {
    const cacheItem = await this.client.getCacheData<T>(this.queryKey);
    this.isRefresh$.next(isRefresh);

    // initial emit
    this.emit(QueryCycle.START);

    if (!isRefresh && cacheItem) {
      this.data$.next(cacheItem.data);
      this.updatedAt$.next(cacheItem.updatedAt);
      this.stalesAt$.next(cacheItem.stalesAt);
      this.expiresAt$.next(cacheItem.expiresAt);
      this.fromCache$.next(true);

      // After Cache
      this.emit(QueryCycle.POST_CACHE_POPULATION);
    }

    if (this.isStale$.value || isRefresh || this.isError$.value) {
      this.isFetching$.next(true);
      this.emit(QueryCycle.PRE_FETCH);
      try {
        const data = await this.queryFn(this.getQueryContext());

        const { stalesAt, expiresAt, updatedAt } =
          await this.client.setCacheData(this.queryKey, data, {
            staleTime: this.options.staleTime,
            cacheTime: this.options.cacheTime,
          });

        this.updatedAt$.next(updatedAt);
        this.stalesAt$.next(stalesAt);
        this.expiresAt$.next(expiresAt);
        this.fromCache$.next(false);
        this.isSuccess$.next(true);
        this.isError$.next(false);
        this.error$.next(undefined);
        this.data$.next(data);

        if (typeof this.options.onSuccess === "function") {
          this.options.onSuccess(this.getQueryContext(), data);
        }
      } catch (error) {
        this.error$.next(error);
        this.isError$.next(true);

        if (typeof this.options.onError === "function") {
          this.options.onError(this.getQueryContext(), error);
        }
      } finally {
        this.isFetching$.next(false);
      }
    }

    this.emit(QueryCycle.END);
  }

  private emit(cycle: QueryCycle) {
    const response = this.buildQueryResponse(cycle);

    if (!this._lastResponse || !this.options.observe) {
      this.emitOrQueue(response);
    }

    if (this._lastResponse && this.options.observe) {
      const change = Object.entries(response)
        .filter(([key]) => this.options.observe?.includes(key))
        .some(
          ([key, value]) =>
            this._lastResponse?.[key as keyof QueryResponse<T>] !== value
        );

      if (change) {
        this.emitOrQueue(response);
      }
    }

    this._lastResponse = response;
  }

  private emitOrQueue(response: QueryResponse<T>) {
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

  private buildQueryResponse(cycle: QueryCycle): QueryResponse<T> {
    return {
      queryKey: this.queryKey,
      data: this.data$.value,
      error: this.error$.value,
      isIdle: this.isIdle$.value,
      isLoading: this.isLoading$.value,
      isFetching: this.isFetching$.value,
      isSuccess: this.isSuccess$.value,
      isError: this.isError$.value,
      isRefresh: this.isRefresh$.value,
      isStale: this.isStale$.value,
      fromCache: this.fromCache$.value,
      createdAt: this.createdAt$.value,
      updatedAt: this.updatedAt$.value,
      cycle,
      refresh: () => this.refresh(),
      cancel: () => this.cancel(),
    };
  }

  private defaultOptions(options: QueryOptions<T>): QueryOptions<T> {
    return {
      cacheTime: 5 * 60 * 1000,
      staleTime: 0,
      observe: undefined,
      ...options,
    };
  }

  public getQueryContext(): QueryContext<T> {
    return {
      queryKey: this.queryKey,
      observer: this.subscriber,
      signal: this.abortController.signal,
      options: this.options,
    };
  }

  private isLoading$Handler() {
    const isLoadingSub = combineLatest([
      this.isFetching$,
      this.fromCache$,
      this.updatedAt$,
      this.isRefresh$,
    ])
      .pipe(
        map(
          ([isFetching, fromCache, updatedAt, isRefresh]) =>
            isFetching && !fromCache && !updatedAt && !isRefresh
        ),
        tap((isLoading) => this.isLoading$.next(isLoading))
      )
      .subscribe();

    this.unmountOrQueue(() => {
      isLoadingSub.unsubscribe();
    });
  }

  private isStale$Handler() {
    const intervalSymbol = Symbol("interval");
    const isStale = () => {
      if (!this.stalesAt$.value) {
        return true;
      }

      if (Date.now() >= this.stalesAt$.value) {
        return true;
      }

      return false;
    };

    const sub = merge(
      this.stalesAt$,
      interval(this.options.staleCheckInterval ?? 1000).pipe(
        map(() => intervalSymbol)
      )
    )
      .pipe(
        map((value) => {
          const stale = isStale();
          if (stale !== this.isStale$.value) {
            this.isStale$.next(stale);
            return value === intervalSymbol;
          }
        }),
        // Only emit when its coming from the interval
        filter((emit) => !!emit),
        tap(() => this.emit(QueryCycle.ON_STALE))
      )
      .subscribe();

    this.unmountOrQueue(() => {
      sub.unsubscribe();
    });
  }

  private isIdle$Handler() {
    const isIdleSub = combineLatest([
      this.data$,
      this.fromCache$,
      this.isRefresh$,
      this.isFetching$,
      this.isSuccess$,
      this.isError$,
    ])
      .pipe(
        map((factors) => factors.every((factor) => !factor)),
        tap((isIdle) => this.isIdle$.next(isIdle))
      )
      .subscribe();

    this.unmountOrQueue(() => {
      isIdleSub.unsubscribe();
    });
  }

  private notifications$Handler() {
    const sub = this.client.notifications$
      .pipe(
        // Only look for notifications addressed to this query
        filter(
          ({ key }) =>
            (!!key && encodeKey(key) === encodeKey(this.queryKey)) || !key
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
      case NotificationType.queryCancel:
        return this.cancel();
      case NotificationType.queryRefresh:
        return this.refresh();
      default:
        console.warn(`Unknown event type: ${event.type}`);
    }
  }

  private validateOptions() {
    if (!this.options.client) {
      throw new Error("Query requires a client");
    }

    if (!this.options.queryKey) {
      throw new Error("Query key is required");
    }

    if (!this.options.queryFn) {
      throw new Error("Query function is required");
    }
  }
}
