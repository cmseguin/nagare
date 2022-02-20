import { NagareClient } from "./client";
import { Subscription } from "rxjs";

const mockFetch = jest.fn();
const mockUnsub = jest.fn();
const mockSub = jest.fn();
let client: NagareClient;
const subscriptions: Subscription[] = [];

describe("NagareClient", () => {
  beforeAll(() => {
    client = new NagareClient();
  });

  beforeEach(async () => {
    await (client as any).storage.clear();
  });

  afterEach(() => {
    mockFetch.mockReset();
    mockUnsub.mockReset();
    mockSub.mockReset();
    subscriptions.forEach((sub) => sub.unsubscribe());
  });

  it("returns a queryClient correctly when instanciate", () => {
    expect(client).toBeTruthy();
  });

  it("returns an observable when calling the query method", () => {
    const storageKey = "test";
    const mockFetchResponse = "myResponse";
    mockFetch.mockResolvedValue(mockFetchResponse);

    const query$ = client.query(storageKey, mockFetch);

    expect(typeof query$.subscribe === "function").toBeTruthy();
  });

  it("calls onUnsubscribe when unsubscribing", () => {
    const storageKey = "test";
    const query$ = client.query(storageKey, () => Promise.resolve(undefined), {
      onUnsubscribe: mockUnsub,
    });
    const sub = query$.subscribe();
    sub.unsubscribe();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  it("calls onSubscribe when subscribing", () => {
    const storageKey = "test";
    const query$ = client.query(storageKey, () => Promise.resolve(undefined), {
      onSubscribe: mockSub,
    });
    const sub = query$.subscribe();
    subscriptions.push(sub);
    expect(mockSub).toHaveBeenCalledTimes(1);
  });

  it("throws if no queryfn is passed", () => {
    expect(() => client.query("test")).toThrowError();
  });

  it("throws if no key is passed", () => {
    expect(() =>
      client.query({ queryFn: () => Promise.resolve() })
    ).toThrowError();
  });

  it("generates a random storage name if none specify", () => {
    expect((client as any).storage._config.name).toMatch(
      /^query-client-[a-z0-9]{4,8}$/
    );
  });
});
