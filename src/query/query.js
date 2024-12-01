import { createContext } from "react";

const context = createContext();

export function QueryClientProvider({ children, client }) {
  return <context.Provider value={client}>{children}</context.Provider>;
}

export class QueryClient {
  constructor() {
    this.queries = [];
  }

  getQuery = (options) => {
    const queryHash = JSON.stringify(options.queryKey);

    let query = this.queries.find(d.queryHash === queryHash);

    if (!query) {
      query = createQuery(this, options);
      this.queries.push(query);
    }

    return query;
  };
}

export function useQuery() {
  return {
    status: "isPending",
    isFetching: true,
    data: undefined,
    error: undefined,
  };
}

export function ReactQueryDevtools() {
  return null;
}

function createQuery(client, { queryKey, queryFn }) {
  let query = {
    queryKey,
    queryHash: JSON.stringify(queryKey),
    promise: null,
    subscribers: [],
    state: {
      status: "isPending",
      isFetching: true,
      data: undefined,
      error: undefined,
    },
    subscribe: (subscriber) => {
      query.subscribers.push(subscriber);

      return () => {
        query.subscribers = query.subscribers.filter((d) => d !== subscriber);
      };
    },
    setState: (updater) => {
      query.state = updater(query.state);
      query.subscribers.forEach((subscriber) => subscriber.notify());
    },
    fetch: () => {
      if (!query.promise) {
        query.promise = (async () => {
          query.setState((old) => ({
            ...old,
            isFetching: true,
            error: undefined,
          }));

          try {
            const data = await queryFn();

            query.setState((old) => ({
              ...old,
              status: "isSuccess",
              data,
            }));
          } catch (error) {
            query.setState((old) => ({
              ...old,
              status: "isError",
              error,
            }));
          } finally {
            query.promise = null;
            query.setState((old) => ({
              ...old,
              isFetching: false,
            }));
          }
        })();
      }

      return query.promise;
    },
  };

  return query;
}

function createQueryObserver(client, { queryKey, queryFn }) {
  const query = client.getQuery({ queryKey, queryFn });

  const observer = {
    notify: () => {},
    getResult: () => query.state,
    subscribe: (callback) => {
      observer.notify = callback;
      const unsubscribe = query.subscribe(observer);

      query.fetch();

      return unsubscribe;
    },
  };

  return observer;
}
