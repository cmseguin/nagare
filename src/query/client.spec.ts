import { QueryClient } from "./client";
import { filter, switchMap, take, tap } from "rxjs/operators";
import { of, Subscription } from "rxjs";
import { QueryCycle } from "../model";

const mockFetch = jest.fn();
const mockUnsub = jest.fn();
const mockSub = jest.fn();
let queryClient: QueryClient;
const subscriptions: Subscription[] = [];

describe("QueryClient", () => {
  beforeAll(() => {
    queryClient = new QueryClient();
  });

  beforeEach(async () => {
    await queryClient.storage.clear();
  });

  afterEach(() => {
    mockFetch.mockReset();
    mockUnsub.mockReset();
    mockSub.mockReset();
    subscriptions.forEach((sub) => sub.unsubscribe());
  });

  it("returns a queryClient correctly when instanciate", () => {
    expect(queryClient).toBeTruthy();
  });

  it("returns an observable when calling the query method", () => {
    const storageKey = "test";
    const mockFetchResponse = "myResponse";
    mockFetch.mockResolvedValue(mockFetchResponse);

    const query$ = queryClient.query(storageKey, mockFetch);

    expect(typeof query$.subscribe === "function").toBeTruthy();
  });

  it("Calls onUnsubscribe when unsubscribing", () => {
    const storageKey = "test";
    const query$ = queryClient.query(
      storageKey,
      () => Promise.resolve(undefined),
      { onUnsubscribe: mockUnsub }
    );
    const sub = query$.subscribe();
    sub.unsubscribe();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it("Calls onSubscribe when subscribing", () => {
    const storageKey = "test";
    const query$ = queryClient.query(
      storageKey,
      () => Promise.resolve(undefined),
      { onSubscribe: mockSub }
    );
    const sub = query$.subscribe();
    subscriptions.push(sub);
    expect(mockSub).toHaveBeenCalledTimes(1);
  });

  it("throws if no queryfn is passed", () => {
    expect(() => queryClient.query("test")).toThrowError();
  });

  it("throws if no key is passed", () => {
    expect(() =>
      queryClient.query({ queryFn: () => Promise.resolve() })
    ).toThrowError();
  });

  it("generates a random storage name if none specify", () => {
    expect((queryClient.storage as any)._config.name).toMatch(
      /^query-client-[a-z0-9]{4,8}$/
    );
  });
});
