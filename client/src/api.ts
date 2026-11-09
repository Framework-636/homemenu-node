// One place for POST, PUT and DELETE requests to the API.

export interface FieldIssue {
  path: string; // e.g. "name" or "ingredients.0.ingredient"
  message: string;
}

export interface SendResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  issues: FieldIssue[];
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null; // a 204 response has an empty body
  } catch {
    return null;
  }
}

export async function sendJson<T = unknown>(
  method: 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: unknown
): Promise<SendResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = parseJson(await res.text());

    if (res.ok) {
      return { ok: true, status: res.status, data: json as T, error: null, issues: [] };
    }
    const errBody = (json ?? {}) as { error?: string; issues?: FieldIssue[] };
    return {
      ok: false,
      status: res.status,
      data: null,
      error: errBody.error ?? `Request failed (${res.status})`,
      issues: errBody.issues ?? [],
    };
  } catch {
    return { ok: false, status: 0, data: null, error: 'Could not reach the server', issues: [] };
  }
}
