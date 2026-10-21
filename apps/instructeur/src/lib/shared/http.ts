async function request(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response;
}

export async function json<T = unknown>(url: string, init?: RequestInit): Promise<T | undefined> {
  const response = await request(url, init);
  if (response.status === 204 || response.status === 205) return undefined;
  return response.json();
}

export async function text(url: string, init?: RequestInit): Promise<string> {
  return (await request(url, init)).text();
}
