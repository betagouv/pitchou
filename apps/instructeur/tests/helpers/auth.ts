import type { UserId } from "@pitchou/types/permissions.ts";
const userByToken = new Map<string, UserId>();
export function registerSession(token: string, userId: UserId) {
  userByToken.set(token, userId);
}
export function sessionUserId(token: string): UserId {
  return userByToken.get(token) ?? (2147483647 as UserId);
}
export function fetchAuthenticated(token: string, url: string | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cookie", `pitchou_session=${token}`);
  if (!["GET", "HEAD"].includes(init.method ?? "GET")) headers.set("origin", new URL(url).origin);
  return fetch(url, { ...init, headers });
}
