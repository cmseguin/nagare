import { BehaviorSubject, combineLatest, interval, of, Subscriber } from "rxjs";
import { tap, map } from "rxjs/operators";
import { xxHash32 } from 'js-xxhash'
import { QueryCycle, QueryFn, QueryOptions, QueryResponse, StorageItem, StorageKey } from "./model";
import { LocalForageInstance } from "./storage";

export class Query<T> {
  private data$: BehaviorSubject<T | undefined> = new BehaviorSubject<T | undefined>(undefined)
  private error$: BehaviorSubject<unknown | undefined> = new BehaviorSubject<unknown | undefined>(undefined)
  private isFetching$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isIdle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isError$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isSuccess$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isRefresh$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private fromCache$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isStale$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  private createdAt$: BehaviorSubject<number> = new BehaviorSubject<number>(Date.now());
  private updatedAt$: BehaviorSubject<number | undefined> = new BehaviorSubject<number | undefined>(undefined);
  private stalesAt$: BehaviorSubject<number | undefined> = new BehaviorSubject<number | undefined>(undefined);
  private expiresAt$: BehaviorSubject<number | undefined> = new BehaviorSubject<number | undefined>(undefined);

  private _lastResponse?: QueryResponse<T>
  private options: QueryOptions<T>;
  private key: StorageKey
  private hash: string
  private queryFn: QueryFn<T>

  constructor(
    private observer: Subscriber<QueryResponse<T>>,
    private storage: LocalForageInstance,
    options: Partial<QueryOptions<T>> = {}
  ) {
    this.options = this.defaultOptions(options)
    if (!this.options.queryFn) {
      throw new Error('QueryFn is required')
    }
    this.queryFn = this.options.queryFn;

    if (!this.options.key) {
      throw new Error('Key is required')
    }
    this.key = this.options.key
    this.hash = this.encodeKey(this.options.key)

    const queryIntervalSub = combineLatest([of(null), interval(1000)]).pipe(
      tap(() => this.updateIsStale())
    ).subscribe()

    const isLoadingSub = combineLatest([
      this.isFetching$, 
      this.fromCache$, 
      this.updatedAt$, 
      this.isRefresh$
    ]).pipe(
      map(([isFetching, fromCache, updatedAt, isRefresh]) => isFetching && !fromCache && !updatedAt && !isRefresh),
      tap(isLoading => this.isLoading$.next(isLoading))
    ).subscribe();

    const isIdleSub = combineLatest([
      this.data$, 
      this.fromCache$, 
      this.isRefresh$, 
      this.isFetching$, 
      this.isSuccess$, 
      this.isError$
    ]).pipe(
      map((factors) => factors.every(factor => !factor)),
      tap(isIdle => this.isIdle$.next(isIdle))
    ).subscribe()

    // When query observable is unsubscribed
    this.observer.add(() => {
      queryIntervalSub.unsubscribe()
      isLoadingSub.unsubscribe()
      isIdleSub.unsubscribe()
    })
  }

  public async run() {
    return this.callQueryFn(false);
  }

  public async refresh() {
    return this.callQueryFn(true);
  }

  public cancel() {
    if (typeof this.options.onCancel === 'function') {
      this.options.onCancel(null)
    }
  }

  private _isStale() {
    if (!this.stalesAt$.value) {
      return true
    }

    if (Date.now() > this.stalesAt$.value) {
      return true
    }

    return false
  }

  private updateIsStale() {
    const isStale = this._isStale()
    if (isStale !== this.isStale$.value) {
      this.isStale$.next(isStale)
      this.emit(QueryCycle.ON_STALE)
    }
  }

  private async callQueryFn(isRefresh: boolean) {
    let resultFromStorage: StorageItem<T> | null | undefined
    const cacheItem = await this.storage.getItem<string>(this.hash)

    this.isRefresh$.next(isRefresh)

    // initial emit
    this.emit(QueryCycle.START)

    if (!isRefresh && cacheItem) {
      try {
        resultFromStorage = JSON.parse(cacheItem ?? 'null') as StorageItem<T> | null
        if (!resultFromStorage) {
          throw new Error('Invalid cache')
        }
        this.data$.next(resultFromStorage.data)
        this.updatedAt$.next(resultFromStorage.updatedAt)
        this.stalesAt$.next(resultFromStorage.stalesAt)
        this.expiresAt$.next(resultFromStorage.expiresAt)
        this.fromCache$.next(true)

        // After Cache
        this.emit(QueryCycle.POST_CACHE_POPULATION)
      } catch {}
    }

    if (this.isStale$.value || isRefresh || this.isError$.value) {
      this.isFetching$.next(true)
      this.emit(QueryCycle.PRE_FETCH)
      try {
        const data = await this.queryFn(null)
        this.data$.next(data)
        this.updatedAt$.next(Date.now())
        this.stalesAt$.next(Date.now() + (this?.options?.staleTime ?? 0))
        this.expiresAt$.next(Date.now() + (this?.options?.cacheTime ?? 0))
        this.fromCache$.next(false)
        this.isSuccess$.next(true)
        this.isError$.next(false)
        this.error$.next(undefined)

        await this.storage.setItem(this.hash, JSON.stringify({ 
          data, 
          expiresAt: this.expiresAt$.value,
          stalesAt: this.stalesAt$.value,
          updatedAt: this.updatedAt$.value
        } as StorageItem<T>))
        
      } catch (error) {
        this.error$.next(error)
        this.isError$.next(true)
      } finally {
        this.isFetching$.next(false)
        this.emit(QueryCycle.END)
      }
    }
  }

  private emit(cycle: QueryCycle) {
    const response = this.buildQueryResponse(cycle)

    if (!this._lastResponse || !this.options.observe) {
      this.observer.next(response)
    }

    if (this._lastResponse && this.options.observe) {
      const change = Object.entries(response)
        .filter(([key]) => this.options.observe?.includes(key))
        .some(([key, value]) => this._lastResponse?.[key as keyof QueryResponse<T>] !== value)

      if (change) {
        this.observer.next(response)
      }
    }

    this._lastResponse = response
  }

  private buildQueryResponse(cycle: QueryCycle): QueryResponse<T> {
    return {
      key: this.key,
      hash: this.hash,
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
    }
  }

  private defaultOptions(options: Partial<QueryOptions<T>>): QueryOptions<T> {
    return {
      cacheTime: 0,
      staleTime: 0,
      observe: undefined,
      ...options
    }
  }

  private encodeKey(key: StorageKey): string {
    return xxHash32(JSON.stringify(key)).toString(16)
  }
}