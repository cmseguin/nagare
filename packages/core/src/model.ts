import { StorageKey } from "./storage";
export { Subscription } from "rxjs";

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
