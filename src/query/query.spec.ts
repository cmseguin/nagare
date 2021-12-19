import { Subscriber } from "rxjs";
import { Query } from "./query";
import { QueryCycle } from "./model";
import { xxHash32 } from "js-xxhash";
import { NagareClient } from "..";

const mockFetch = jest.fn();
const mockCancel = jest.fn();
const mockNext = jest.fn();
let client: NagareClient;
let unMountFunctions = [];
const subscriber = {
  next: mockNext,
  add: jest.fn((fn: () => void) => {
    unMountFunctions.push(fn);
  }),
  remove: jest.fn(),
  error: jest.fn(),
  complete: jest.fn(),
  unsubscribe: jest.fn(() => {
    unMountFunctions.forEach((fn) => fn());
    unMountFunctions = [];
  }),
} as any as Subscriber<any>;

describe("Query", () => {
  beforeEach(() => {
    client = new NagareClient();
    jest.clearAllMocks();
    (client as any).storage.clear();
  });

  afterEach(() => {
    subscriber.unsubscribe();
    mockNext.mockClear();
  });

  it("is defined", () => {
    expect(Query).toBeDefined();
  });

  xit("throws if no key is passed", () => {
    expect(() => {
      new Query({
        client,
        subscriber,
        queryFn: () => Promise.resolve(),
        queryKey: undefined,
      });
    }).toThrowError();
  });

  xit("throws if no queryFn is passed", () => {
    expect(() => {
      new Query({ client, subscriber, queryKey: "test", queryFn: undefined });
    }).toThrowError();
  });

  it("emits after stale time is up", async () => {
    const storageKey = "test";
    const mockFetchResponse = "myResponse";
    mockFetch.mockResolvedValue(mockFetchResponse);
    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
      staleTime: 100,
      staleCheckInterval: 10,
    });
    await query.run();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ cycle: QueryCycle.ON_STALE })
    );
  });

  it("calls onCancel if cancelled", async () => {
    const query = new Query({
      client,
      subscriber,
      queryKey: "test",
      queryFn: mockFetch,
      onCancel: mockCancel,
    });
    query.cancel();
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it("wont call post-cache cycle emit if value doesn't contain expiration", async () => {
    const storageKey = "test";
    const hash = xxHash32(JSON.stringify(storageKey)).toString(16);
    await (client as any).storage.setItem(hash, "{}");

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
    });
    await query.run();

    expect(mockNext).not.toHaveBeenCalledWith(
      expect.objectContaining({ cycle: QueryCycle.POST_CACHE_POPULATION })
    );
  });

  it("wont call post-cache cycle emit if value contains old expiration", async () => {
    const storageKey = "test";
    const hash = xxHash32(JSON.stringify(storageKey)).toString(16);
    await (client as any).storage.setItem(
      hash,
      `{ "data": {}, "expiresAt": 0 }`
    );

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
    });
    await query.run();

    expect(mockNext).not.toHaveBeenCalledWith(
      expect.objectContaining({ cycle: QueryCycle.POST_CACHE_POPULATION })
    );
  });

  it("won't call post-cache cycle emit if value is wrong in storage", async () => {
    const storageKey = "test";
    const hash = xxHash32(JSON.stringify(storageKey)).toString(16);
    await (client as any).storage.setItem(hash, "0");

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
    });
    await query.run();

    expect(mockNext).not.toHaveBeenCalledWith(
      expect.objectContaining({ cycle: QueryCycle.POST_CACHE_POPULATION })
    );
  });

  it("will call post-cache cycle emit if value contains future expiration", async () => {
    const storageKey = "test";
    const hash = xxHash32(JSON.stringify(storageKey)).toString(16);
    await (client as any).storage.setItem(
      hash,
      `{ "data": {}, "expiresAt": 99999999999999 }`
    );

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
    });
    await query.run();

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ cycle: QueryCycle.POST_CACHE_POPULATION })
    );
  });

  it("emit error if fetch call fails", async () => {
    const storageKey = "test";
    mockFetch.mockRejectedValue(new Error("test"));

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
    });
    await query.run();

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true })
    );
  });

  it("emit only 2 times when observing only data", async () => {
    const storageKey = "test";
    const mockFetchResponse = "myResponse";
    mockFetch.mockResolvedValue(mockFetchResponse);

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
      observe: ["data"],
    });
    await query.run();

    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it("emits the right values for a simple fetch", async () => {
    const storageKey = "test";
    const mockFetchResponse = "myResponse";
    mockFetch.mockResolvedValue(mockFetchResponse);

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
    });

    await query.run();

    // Last call condition
    expect(mockNext).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: undefined,
        isIdle: true,
        isStale: true,
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        fromCache: false,
      })
    );
    expect(mockNext).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: undefined,
        isIdle: false,
        isStale: true,
        isLoading: true,
        isFetching: true,
        isSuccess: false,
        fromCache: false,
      })
    );
    expect(mockNext).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: mockFetchResponse,
        isIdle: false,
        isStale: true,
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        fromCache: false,
      })
    );
    expect(subscriber.next).toHaveBeenCalledTimes(3);
  });

  it("calls the query function only once if staleTime is set and multiple query with same key are made", async () => {
    const storageKey = "myQueryKey";
    const mockFetchResponse = "myResponse";
    mockFetch.mockResolvedValue(mockFetchResponse);

    const query1 = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
      staleTime: 1000 * 60,
    });
    const query2 = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
    });

    await query1.run();
    await query2.run();

    expect(mockNext.mock.calls.map((r) => r?.[0]?.cycle)).toEqual([
      QueryCycle.START,
      QueryCycle.PRE_FETCH,
      QueryCycle.END,
      QueryCycle.START,
      QueryCycle.POST_CACHE_POPULATION,
      QueryCycle.END,
    ]);
    expect(mockNext).toHaveBeenCalledTimes(6);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("calls the query function twice if refresh", async () => {
    const storageKey = "myQueryKey";
    const mockFetchResponse = { data: { test: "test" } };
    mockFetch.mockResolvedValue(mockFetchResponse);

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
    });

    await query.run();
    await query.refresh();

    expect(mockNext).toHaveBeenCalledTimes(6);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("calls the onSuccess hook if call is success", async () => {
    const storageKey = "myQueryKey";
    const mockFetchResponse = "myResponse";
    mockFetch.mockResolvedValue(mockFetchResponse);

    const onSuccess = jest.fn();

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
      onSuccess,
    });

    await query.run();

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(
      expect.any(Object),
      mockFetchResponse
    );
  });

  it("calls the onError hook if call fails", async () => {
    const storageKey = "myQueryKey";
    mockFetch.mockRejectedValue(new Error("test"));

    const onError = jest.fn();

    const query = new Query({
      client,
      subscriber,
      queryKey: storageKey,
      queryFn: mockFetch,
      onError,
    });

    await query.run();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Object), expect.any(Error));
  });
});
