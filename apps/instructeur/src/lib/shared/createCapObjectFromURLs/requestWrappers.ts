import { json, text } from "d3-fetch";

const commonRequestInit = { headers: { Accept: "application/json" } };

export class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function wrapGETUrl(url: string | undefined): any {
  return url ? () => json(url, commonRequestInit) : undefined;
}

export function wrapPOSTUrl(url: string | undefined, extraInit: RequestInit = {}): any {
  if (!url) return undefined;
  return (args: any) =>
    json(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      ...extraInit,
    });
}

export function wrapDeleteById(url: string | undefined, placeholder: string): any {
  if (!url) return undefined;
  if (!url.includes(placeholder))
    throw new Error(`Cap URL ${url} ne contient pas le placeholder ${placeholder}`);
  return (id: any) =>
    text(url.replace(placeholder, encodeURIComponent(String(id))), { method: "DELETE" });
}

export function wrapTextPOST(url: string | undefined): any {
  if (!url) return undefined;
  return (args: any) =>
    text(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
}

export function wrapPOSTMultipart(url: string | undefined): any {
  if (!url) return undefined;
  return async (form: FormData) => {
    const response = await fetch(url, { method: "POST", body: form });
    if (!response.ok) {
      const body = (await response.text().catch(() => "")).trim();
      throw new Error(body || `Une erreur est survenue (${response.status})`);
    }
    return response.text();
  };
}
