import localforage from "localforage";
import { QueryObservable } from "./observable";

describe("QueryObservable", () => {
  it("throws if no storage is passed", () => {
    expect(() => {
      new QueryObservable(undefined, {
        key: "test",
        queryFn: () => Promise.resolve(undefined),
      });
    }).toThrowError();
  });

  it("throws if no key is passed", () => {
    expect(() => {
      new QueryObservable(localforage, {
        queryFn: () => Promise.resolve(undefined),
      });
    }).toThrowError();
  });

  it("throws if no queryFn is passed", () => {
    expect(() => {
      new QueryObservable(localforage, {
        key: "test",
      });
    }).toThrowError();
  });

  it("Returns an observable", () => {
    const queryObservable = new QueryObservable(localforage, {
      key: "test",
      queryFn: () => Promise.resolve(undefined),
    });

    // RxJS signature
    expect(typeof queryObservable.subscribe).toBe("function");
    expect(typeof queryObservable.pipe).toBe("function");
    expect(typeof queryObservable.forEach).toBe("function");
  });
});
