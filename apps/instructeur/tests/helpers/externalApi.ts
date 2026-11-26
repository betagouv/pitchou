import { expect } from "vitest";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

export function readExternalApi(secret: string, path: string, method = "GET") {
  const url = path.startsWith("/api/v1/") ? path : "/api/v1" + path;
  return fetch(INTEGRATION_BASE_URL + url, {
    method,
    headers: { Authorization: `Bearer ${secret}` },
  });
}

export async function readExternalApiJson(secret: string, path: string) {
  const response = await readExternalApi(secret, path);
  const content = await response.text();
  expect(response.status, `${path} ${content}`).toBe(200);
  return JSON.parse(content);
}
