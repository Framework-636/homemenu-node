import { useEffect, useState } from 'react';

interface ApiResult<T> {
  url: string;
  data: T | null;
  error: string | null;
  notFound: boolean;
}

// Load JSON from the API and track loading, errors and 404s
export function useApi<T>(url: string) {
  const [result, setResult] = useState<ApiResult<T> | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setResult({ url, data: null, error: null, notFound: true });
          return;
        }
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as T;
        if (!cancelled) setResult({ url, data, error: null, notFound: false });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) setResult({ url, data: null, error: message, notFound: false });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  const loading = result?.url !== url;
  return {
    loading,
    data: loading ? null : (result?.data ?? null),
    error: loading ? null : (result?.error ?? null),
    notFound: !loading && (result?.notFound ?? false),
  };
}
