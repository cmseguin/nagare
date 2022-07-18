import { StorageKey } from "./storage";
import { Subscription as rxjsSubscription } from "rxjs";

export type Subscription = typeof rxjsSubscription;

export interface StorageItem<T = unknown> {
  key: StorageKey;
  data: T;
  updatedAt: number;
  expiresAt: number;
  stalesAt: number;
}

export interface NotificationEvent<PayloadType = unknown> {
  type: NotificationType;
  key?: StorageKey;
  payload?: PayloadType;
}

export enum NotificationType {
  queryCancel = "queryCancel",
  queryRetry = "queryRetry",
  queryRefresh = "queryRefresh",
  queryInvalidate = "queryInvalidate",
  mutationCancel = "mutationCancel",
  mutationRetry = "mutationRetry",
}

export interface QueueItem<T extends string, P = unknown> {
  type: T;
  payload: P;
}
