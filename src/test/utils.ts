import { Observable } from "rxjs";
import { QueryResponse } from "../model";

export const subscribeAndWaitForQuerySuccess = async <T = any>(
  sub: Observable<QueryResponse<T>>,
  timeout: number | undefined = 50
): Promise<undefined | QueryResponse<T>> => {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line
    let timeoutId: NodeJS.Timeout | undefined;
    sub.subscribe({
      next: (v) => {
        if (!v.isSuccess) return;
        resolve(v);
        if (!timeoutId) return;
        clearTimeout(timeoutId);
      },
      error: () => {
        reject(undefined);
        if (!timeoutId) return;
        clearTimeout(timeoutId);
      },
    });
    timeoutId = setTimeout(() => {
      resolve(undefined);
      console.error("TIMEOUT");
    }, timeout);
  });
};
