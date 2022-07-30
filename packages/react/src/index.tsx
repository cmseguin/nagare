import React, { useEffect, useContext, useState, useRef } from "react";
import {
  MutationObservable,
  MutationParams,
  MutationResponse,
  NagareClient,
  QueryObservable,
  QueryParams,
  QueryResponse,
} from "@nagare/core";

const NagareContext = React.createContext<NagareClient | undefined>(undefined);

/**
 * ## NagareClientProvider
 * Provides the nagare client to the application.
 */
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

/**
 * ## useQuery
 * Wrapper around `NagareClient.query`
 * @param args QueryParams
 * @returns QueryResponse
 */
export function useQuery<T = unknown>(...args: QueryParams<T>) {
  const client = useContext(NagareContext);
  const subscription = useRef<{ unsubscribe: () => void }>();
  const queryObservable$ = useRef<QueryObservable<T>>();

  if (!client) {
    throw new Error("Client not defined");
  }

  if (!queryObservable$.current) {
    queryObservable$.current = client.query<T>(...args);
  }

  const [query, setQuery] = useState<QueryResponse<T>>(
    queryObservable$.current.initialResponse
  );

  useEffect(() => {
    subscription.current = queryObservable$.current?.subscribe((r) =>
      setQuery(r)
    );
    return () => {
      subscription.current?.unsubscribe();
    };
  }, []);

  return query as NonNullable<QueryResponse<T>>;
}

/**
 * ## useMutation
 * Wrapper around `NagareClient.mutate`
 * @param args MutationParams
 * @returns MutationResponse
 */
export function useMutation<T = unknown>(...args: MutationParams<T>) {
  const client = useContext(NagareContext);
  const subscription = useRef<{ unsubscribe: () => void }>();
  const mutationObservable$ = useRef<MutationObservable<T>>();

  if (!client) {
    throw new Error("Client not defined");
  }

  if (!mutationObservable$.current) {
    mutationObservable$.current = client.mutation<T>(...args);
  }

  const [mutation, setMutation] = useState<MutationResponse<T>>(
    mutationObservable$.current.initialResponse
  );

  useEffect(() => {
    subscription.current = mutationObservable$.current?.subscribe((r) =>
      setMutation(r)
    );
    return () => {
      subscription.current?.unsubscribe();
    };
  }, []);

  return mutation as NonNullable<MutationResponse<T>>;
}

/**
 * ## useClient
 * Returns the nagare client instance.
 * @returns NagareClient
 */
export function useClient() {
  return useContext(NagareContext);
}
