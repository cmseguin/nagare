import { Observable } from "rxjs";
import { MutationFn, MutationMethodOptions } from "./mutation/model";
import { QueryFn, QueryOptions, QueryResponse } from "./query/model";
import { StorageKey } from "./storage";

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
