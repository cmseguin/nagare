import type { Subscriber } from "rxjs";

export const createMockSubscriber = () => {
  const mockNext = jest.fn();
  let unMountFunctions: (() => any)[] = [];
  const mockSubscriber = {
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
  return {
    unMountFunctions,
    subscriber: mockSubscriber,
    mockNext,
  };
};
