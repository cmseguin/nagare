import EventEmitter from "events";

export const createRcPromise = () => {
  const emitter = new EventEmitter();
  const promise = new Promise<any>((resolve, reject) => {
    emitter.on("resolve", resolve);
    emitter.on("reject", reject);
  });
  const rcResolve = () => {
    emitter.emit("resolve");
    return promise;
  };
  const rcReject = () => {
    emitter.emit("reject");
    return promise;
  };
  const mockPromise = jest.fn().mockReturnValue(promise);
  return {
    resolve: rcResolve,
    reject: rcReject,
    promise: mockPromise,
  };
};
