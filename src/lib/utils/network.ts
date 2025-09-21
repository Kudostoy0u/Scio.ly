const inflightRequests = new Map<string, Promise<Response>>();

export async function fetchOnce(input: string, init?: RequestInit): Promise<Response> {
  const key = init ? `${input}::${JSON.stringify(init)}` : input;
  const existing = inflightRequests.get(key);
  if (existing) return existing;
  const p = fetch(input, init).finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, p);
  return p;
}

export async function getJsonOnce<T = any>(input: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetchOnce(input, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}


