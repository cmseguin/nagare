import { Subscriber } from "rxjs";
import { NagareClient } from "../client";
import { LocalForageInstance, StorageKey } from "../storage";

export enum MutationCycle {
  MUTATE = "mutate",
  START = "start",
  END = "end",
}

export type MutationFn<T = unknown> = (
  context: MutationContext<T>
) => Promise<T>;

export interface MutationResponse<T = unknown> {
  mutationKey: StorageKey;
  data: T | undefined;
  error: unknown | undefined;
  isLoading: boolean;
  isIdle: boolean;
  isSuccess: boolean;
  isError: boolean;
  cycle: MutationCycle;
  cancel: () => void;
}

export type MutationMethodOptions<T = unknown> = Partial<
  Omit<MutationOptions<T>, "client">
>;

export type MutationObservableOptions<T = unknown> = Omit<
  MutationOptions<T>,
  "subscriber"
> & {
  onSubscribe?: (context: MutationContext<T>) => void;
  onUnsubscribe?: (context: MutationContext<T>) => void;
};

export interface MutationOptions<T = unknown> {
  client: NagareClient;
  subscriber: Subscriber<MutationResponse<T>>;
  mutationKey: StorageKey;
  mutationFn: MutationFn<T>;
  storage?: LocalForageInstance;
  observe?: Omit<keyof MutationResponse<T>, "cancel">[];
  cacheTime?: number;
  staleTime?: number;
  onMutate?: (context: MutationContext<T>) => void;
  onSuccess?: (context: MutationContext<T>, data: T) => void;
  onError?: (context: MutationContext<T>, error: unknown) => void;
  onCancel?: (context: MutationContext<T>) => void;
}

export interface MutationContext<T = unknown> {
  observer: Subscriber<MutationResponse<T>>;
  options: MutationOptions<T>;
  signal: AbortSignal;
}
