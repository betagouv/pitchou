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

/** The message of a SvelteKit `error()` body, or the raw text. */
function errorMessageFromBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    // not JSON: fall through to the raw text
  }
  return body.trim();
}

/**
 * JSON POST that surfaces the server's error message instead of d3-fetch's
 * bare status text, and returns undefined on an empty (204) response.
 */
export function wrapJsonPOST(url: string | undefined, extraInit: RequestInit = {}): any {
  if (!url) return undefined;
  return async (args: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(args),
      ...extraInit,
    });
    const body = await response.text().catch(() => "");
    if (!response.ok) {
      throw new RequestError(
        response.status,
        errorMessageFromBody(body) || `Une erreur est survenue (${response.status})`,
      );
    }
    return body ? JSON.parse(body) : undefined;
  };
}
