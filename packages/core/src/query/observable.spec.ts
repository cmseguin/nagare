import { NagareClient } from "../client";
import { QueryResponse } from "./model";
import { QueryObservable } from "./observable";

let client: NagareClient;

describe("QueryObservable", () => {
  beforeAll(() => {
    client = new NagareClient();
  });

  it("throws if no client is passed", () => {
    expect(() => {
      new QueryObservable({
        client: undefined,
        queryKey: "test",
        queryFn: () => Promise.resolve(undefined),
      });
    }).toThrowError();
  });

  it("throws if no key is passed", () => {
    expect(() => {
      new QueryObservable({
        client,
        queryKey: undefined,
        queryFn: () => Promise.resolve(undefined),
      });
    }).toThrowError();
  });

  it("throws if no queryFn is passed", () => {
    expect(() => {
      new QueryObservable({
        client,
        queryKey: "test",
        queryFn: undefined,
      });
    }).toThrowError();
  });

  it("Returns an observable", () => {
    const queryObservable = new QueryObservable({
      client,
      queryKey: "test",
      queryFn: () => Promise.resolve(undefined),
    });

    // RxJS signature
    expect(typeof queryObservable.subscribe).toBe("function");
    expect(typeof queryObservable.pipe).toBe("function");
    expect(typeof queryObservable.forEach).toBe("function");
  });

  it("Emits syncronously an initial response", () => {
    let response: QueryResponse<any>;
    const queryObservable = new QueryObservable({
      client,
      queryKey: "test",
      queryFn: () => Promise.resolve(undefined),
    });

    expect(queryObservable.initialResponse).toBeDefined();
    const sub = queryObservable.subscribe((r) => {
      response = r;
    });
    expect(queryObservable.initialResponse).toBeDefined();
    sub.unsubscribe();
  });
});
