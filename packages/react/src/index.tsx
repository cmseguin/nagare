import React, { useEffect, useContext, useState } from "react";
import {
  MutationFn,
  MutationMethodOptions,
  MutationResponse,
  NagareClient,
  QueryFn,
  QueryMethodOptions,
  QueryResponse,
  StorageKey,
} from "@nagare/core";

// TODO Remove this when exporting in core
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

const NagareContext = React.createContext<NagareClient | undefined>(undefined);

export const NagareClientProvider: React.FC<{
  client: NagareClient;
  children: React.ReactNode;
}> = ({ client, children }) => {
  if (!client) {
    return <>{children}</>;
  }
  return (
    <NagareContext.Provider value={client}>{children}</NagareContext.Provider>
  );
};

export function useQuery<T = unknown>(...args: QueryParams<T>) {
  const client = useContext(NagareContext);

  if (!client) {
    throw new Error("Client not defined");
  }

  const queryObservable$ = client.query<T>(...args);
  const [query, setQuery] = useState<QueryResponse<T>>();

  useEffect(() => {
    const subscription = queryObservable$.subscribe((r) => setQuery(r));
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return query;
}

export function useMutation<T = unknown>(...args: MutationParams<T>) {
  const client = useContext(NagareContext);

  if (!client) {
    throw new Error("Client not defined");
  }

  const mutationObservable$ = client.mutation<T>(...args);
  const [mutation, setMutation] = useState<MutationResponse<T>>();

  useEffect(() => {
    const subscription = mutationObservable$.subscribe((r) => setMutation(r));
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return mutation;
}
