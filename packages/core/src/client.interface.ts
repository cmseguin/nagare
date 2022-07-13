import { Observable } from "rxjs";
import { MutationFn, MutationMethodOptions } from "./mutation/model";
import {
  QueryFn,
  QueryMethodOptions,
  QueryOptions,
  QueryResponse,
} from "./query/model";
import { StorageKey } from "./storage";

export type QueryParams<T> = [
  arg0: QueryMethodOptions<T> | StorageKey,
  arg1?: QueryMethodOptions<T> | QueryFn<T>,
  arg2?: QueryMethodOptions<T>
];

export type MutationParams<T> = [
  arg0: MutationMethodOptions<T> | StorageKey,
  arg1?: MutationMethodOptions<T> | MutationFn<T>,
  arg2?: MutationMethodOptions<T>
];

export abstract class NagareClientInterface {
  public abstract query<T = unknown>(
    options: QueryOptions<T>
  ): Observable<QueryResponse<T>>;
  public abstract query<T = unknown>(
    queryKey: StorageKey,
    options?: QueryOptions<T>
  ): Observable<QueryResponse<T>>;
  public abstract query<T = unknown>(
    queryKey: StorageKey,
    queryFn: QueryFn<T>,
    options?: QueryOptions<T>
  ): Observable<QueryResponse<T>>;

  public abstract mutation<T = unknown>(
    options: MutationMethodOptions<T>
  ): Observable<T>;
  public abstract mutation<T = unknown>(
    key: StorageKey,
    options?: MutationMethodOptions<T>
  ): Observable<T>;
  public abstract mutation<T = unknown>(
    key: StorageKey,
    mutationFn: MutationFn<T>,
    options?: MutationMethodOptions<T>
  ): Observable<T>;
}
