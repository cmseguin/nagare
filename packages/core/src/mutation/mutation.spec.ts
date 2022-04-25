import { NagareClient } from "../client";
import { createMockSubscriber } from "../__test__/subscriber";
import { createRcPromise } from "../__test__/rc-promise";
import { Mutation } from "./mutation";
import { MutationCycle } from "./model";

let client: NagareClient;
const { subscriber, mockNext } = createMockSubscriber();

describe("Mutation", () => {
  beforeEach(() => {
    client = new NagareClient();
    jest.clearAllMocks();
    (client as any).storage.clear();
  });

  afterEach(() => {
    subscriber.unsubscribe();
    mockNext.mockClear();
  });

  it("throws if there is no client", () => {
    expect(() => {
      new Mutation({
        client: undefined,
        mutationKey: "test",
        mutationFn: () => Promise.resolve(),
        subscriber,
      });
    }).toThrowError();
  });

  it("throws if there is no mutation key", () => {
    expect(() => {
      new Mutation({
        client,
        mutationKey: undefined,
        mutationFn: () => Promise.resolve(),
        subscriber,
      });
    }).toThrowError();
  });

  it("throws if there is no mutation function", () => {
    expect(() => {
      new Mutation({
        client,
        mutationKey: "test",
        mutationFn: undefined,
        subscriber,
      });
    }).toThrowError();
  });

  it("is instanciable", () => {
    const mutation = new Mutation({
      client,
      mutationKey: "test",
      mutationFn: () => Promise.resolve(),
      subscriber,
    });
    expect(mutation).toBeInstanceOf(Mutation);
  });

  it("will call the mutation function when we mutate", async () => {
    const mutationFnMock = jest.fn().mockResolvedValue("test");
    const mutation = new Mutation({
      client,
      mutationKey: "test",
      mutationFn: mutationFnMock,
      subscriber,
    });

    expect(mutationFnMock).toBeCalledTimes(0);
    await mutation.mutate();
    expect(mutationFnMock).toBeCalledTimes(1);
  });

  it("will call the onMutate before onSuccess function when we mutate", async () => {
    const onMutateMock = jest.fn();
    const onSuccessMock = jest.fn();
    const onErrorMock = jest.fn();
    const { promise: mockPromise, resolve } = createRcPromise();

    const mutation = new Mutation({
      client,
      mutationKey: "test",
      mutationFn: mockPromise,
      subscriber,
      onMutate: onMutateMock,
      onSuccess: onSuccessMock,
      onError: onErrorMock,
    });

    expect(onMutateMock).toBeCalledTimes(0);
    expect(onSuccessMock).toBeCalledTimes(0);
    expect(onErrorMock).toBeCalledTimes(0);
    mutation.mutate();
    expect(onMutateMock).toBeCalledTimes(1);
    expect(onSuccessMock).toBeCalledTimes(0);
    expect(onErrorMock).toBeCalledTimes(0);
    await resolve();
    expect(onMutateMock).toBeCalledTimes(1);
    expect(onSuccessMock).toBeCalledTimes(1);
    expect(onErrorMock).toBeCalledTimes(0);
  });

  it("will call the onMutate before onError function when we mutate and not call onSuccess", async () => {
    const onMutateMock = jest.fn();
    const onSuccessMock = jest.fn();
    const onErrorMock = jest.fn();

    const mutation = new Mutation({
      client,
      mutationKey: "test",
      mutationFn: jest.fn().mockRejectedValue(new Error("test")),
      subscriber,
      onMutate: onMutateMock,
      onSuccess: onSuccessMock,
      onError: onErrorMock,
    });

    expect(onMutateMock).toBeCalledTimes(0);
    expect(onSuccessMock).toBeCalledTimes(0);
    expect(onErrorMock).toBeCalledTimes(0);
    try {
      const p = mutation.mutate();
      expect(onMutateMock).toBeCalledTimes(1);
      expect(onSuccessMock).toBeCalledTimes(0);
      expect(onErrorMock).toBeCalledTimes(0);
      await p;
    } catch {
      expect(onMutateMock).toBeCalledTimes(1);
      expect(onSuccessMock).toBeCalledTimes(0);
      expect(onErrorMock).toBeCalledTimes(1);
    }
  });

  it("will call the onCancel if we cancel the mutation", async () => {
    const onCancelMock = jest.fn();

    const mutation = new Mutation({
      client,
      mutationKey: "test",
      mutationFn: jest.fn().mockResolvedValue("test"),
      subscriber,
      onCancel: onCancelMock,
    });

    expect(onCancelMock).toBeCalledTimes(0);
    const p = mutation.mutate();
    expect(onCancelMock).toBeCalledTimes(0);
    await mutation.cancel();
    expect(onCancelMock).toBeCalledTimes(1);
    await p;
    expect(onCancelMock).toBeCalledTimes(1);
  });

  it("will emit in the subscriber", async () => {
    const mutation = new Mutation({
      client,
      mutationKey: "test",
      mutationFn: jest.fn().mockResolvedValue("test"),
      subscriber,
    });

    await mutation.mutate();
    expect(mockNext).toHaveBeenCalledTimes(3);
    expect(mockNext).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ cycle: MutationCycle.MUTATE })
    );
    expect(mockNext).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cycle: MutationCycle.START })
    );
    expect(mockNext).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ cycle: MutationCycle.END })
    );
  });

  it("will emit only when observed value change in the subscriber", async () => {
    const mutation = new Mutation({
      client,
      mutationKey: "test",
      mutationFn: jest.fn().mockResolvedValue("test"),
      subscriber,
      observe: ["data"],
    });

    await mutation.mutate();
    expect(mockNext).toHaveBeenCalledTimes(2);
    expect(mockNext).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ cycle: MutationCycle.MUTATE })
    );
    expect(mockNext).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cycle: MutationCycle.END })
    );
  });
});
