import * as oidc from "@pitchou/server/proconnect.ts";
import { getBaseUrl } from "./env.ts";
export { randomToken } from "@pitchou/server/proconnect.ts";
export const buildAuthorizationUrl = (state: string, nonce: string) =>
  oidc.buildAuthorizationUrl(state, nonce, getBaseUrl());
export const exchangeCodeAndFetchUser = (code: string, nonce: string) =>
  oidc.exchangeCodeAndFetchUser(code, nonce, getBaseUrl());
export const buildLogoutUrl = (token: string, state: string) =>
  oidc.buildLogoutUrl(token, state, getBaseUrl());
