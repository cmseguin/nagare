import { QueryClient } from './query-client';
import { filter, switchMap, take, tap } from 'rxjs/operators'
import { of, Subscription } from 'rxjs';
import { QueryCycle } from './model';

let mockFetch = jest.fn();
let mockUnsub = jest.fn();
let mockSub = jest.fn();
let queryClient: QueryClient;
let subscriptions: Subscription[] = [];

describe('QueryClient', () => {
  beforeAll(() => {
    queryClient = new QueryClient()
  })

  beforeEach(async () => {
    await queryClient.storage.clear()
  })

  afterEach(() => {
    mockFetch.mockReset()
    mockUnsub.mockReset()
    mockSub.mockReset()
    subscriptions.forEach(sub => sub.unsubscribe())
  })

  it('returns a queryClient correctly when instanciate', () => {
    expect(queryClient).toBeTruthy();
  })

  it('returns an observable when calling the query method', () => {
    const storageKey = 'test'
    const mockFetchResponse = 'myResponse'
    mockFetch.mockResolvedValue(mockFetchResponse)

    const query$ = queryClient.query(storageKey, mockFetch)

    expect(typeof query$.subscribe === 'function').toBeTruthy()
  })

  it('Calls onUnsubscribe when unsubscribing', () => {
    const storageKey = 'test'
    const query$ = queryClient.query(storageKey, () => Promise.resolve(undefined), { onUnsubscribe: mockUnsub })
    const sub = query$.subscribe()
    sub.unsubscribe()
    expect(mockUnsub).toHaveBeenCalledTimes(1)
  })

  it('Calls onSubscribe when subscribing', () => {
    const storageKey = 'test'
    const query$ = queryClient.query(storageKey, () => Promise.resolve(undefined), { onSubscribe: mockSub })
    const sub = query$.subscribe()
    subscriptions.push(sub)
    expect(mockSub).toHaveBeenCalledTimes(1)
  })

  it('throws if no queryfn is passed', () => {
    expect(() => queryClient.query('test')).toThrowError()
  })

  it('throws if no key is passed', () => {
    expect(() => queryClient.query({ queryFn: () => Promise.resolve() })).toThrowError()
  })

  it('emits the right values for a simple fetch subscription', (done) => {
    const storageKey = 'test'
    const mockFetchResponse = 'myResponse'
    mockFetch.mockResolvedValue(mockFetchResponse)
    const mockSubscriber = jest.fn()

    const query$ = queryClient.query(storageKey, mockFetch)

    const sub = query$.subscribe((r) => {
      mockSubscriber(r)

      // Last call condition
      if (!r.isLoading && r.isSuccess && !r.fromCache) {
        expect(mockSubscriber).toHaveBeenNthCalledWith(1, expect.objectContaining({ 
          data: undefined,
          isIdle: true,
          isStale: true,
          isLoading: false,
          isFetching: false,
          isSuccess: false, 
          fromCache: false
        }))
        expect(mockSubscriber).toHaveBeenNthCalledWith(2, expect.objectContaining({ 
          data: undefined,
          isIdle: false,
          isStale: true,
          isLoading: true,
          isFetching: true,
          isSuccess: false, 
          fromCache: false 
        }))
        expect(mockSubscriber).toHaveBeenNthCalledWith(3, expect.objectContaining({ 
          data: mockFetchResponse,
          isIdle: false,
          isStale: true,
          isLoading: false,
          isFetching: false,
          isSuccess: true, 
          fromCache: false 
        }))
        expect(mockSubscriber).toHaveBeenCalledTimes(3)
        done()
      }
    })

    // Clean this subscription after the test
    subscriptions.push(sub)
  })

  it('calls the query function only once if staleTime is set and multiple query with same key are made', (done) => {
    const storageKey = 'myQueryKey'
    const mockFetchResponse = 'myResponse'
    mockFetch.mockResolvedValue(mockFetchResponse)

    const query1$ = queryClient.query(storageKey, mockFetch, { staleTime: 1000 * 60, onUnsubscribe: mockUnsub })
    const query2$ = queryClient.query(storageKey, mockFetch, { onUnsubscribe: mockUnsub })

    const sub = query1$.pipe(
      filter(r => r.isSuccess),
      take(1),
      switchMap(() => query2$),
      filter(r => r.fromCache),
      take(1),
    ).subscribe(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
      sub.unsubscribe()
      expect(mockUnsub).toHaveBeenCalledTimes(2)
      done()
    })
  })

  it('calls the query function twice if refresh', (done) => {
    const storageKey = 'myQueryKey'
    const mockFetchResponse = { data: { test: 'test' } }
    mockFetch.mockResolvedValue(mockFetchResponse)

    const query1$ = queryClient.query(storageKey, mockFetch, { onUnsubscribe: mockUnsub })

    const sub = query1$.pipe(
      filter(r => r.isSuccess),
      tap((r) => {
        if (!r.isRefresh) { // refresh once
          r.refresh()
        }
      }),
      filter(r => r.isRefresh && r.isSuccess && r.cycle === QueryCycle.END),
      take(1),
    ).subscribe(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
      sub.unsubscribe()
      expect(mockUnsub).toHaveBeenCalledTimes(1)
      done()
    })
  })
})