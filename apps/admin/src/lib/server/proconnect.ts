import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { requireEnv, getBaseUrl } from "./env.ts";

// All ProConnect endpoints live under https://PROCONNECT_DOMAIN/api/v2/ (see ProConnect docs).
type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
};

const REDIRECT_PATH = "/auth/callback";
const POST_LOGOUT_PATH = "/auth/login";
const SCOPE = "openid email given_name usual_name";

let discoveryCache: Promise<Discovery> | null = null;
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getDiscovery(): Promise<Discovery> {
  if (!discoveryCache) {
    const url = `https://${requireEnv("PROCONNECT_DOMAIN")}/api/v2/.well-known/openid-configuration`;
    discoveryCache = fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`ProConnect discovery failed: ${res.status}`);
        return (await res.json()) as Discovery;
      })
      .catch((err) => {
        // Don't cache a failed discovery: let the next attempt retry.
        discoveryCache = null;
        throw err;
      });
  }
  return discoveryCache;
}

function getJwks(jwksUri: string) {
  if (!jwksCache) jwksCache = createRemoteJWKSet(new URL(jwksUri));
  return jwksCache;
}

function redirectUri(): string {
  return `${getBaseUrl()}${REDIRECT_PATH}`;
}

/** ProConnect requires state and nonce to be at least 32 characters long. */
export function randomToken(): string {
  return randomBytes(32).toString("hex");
}

export async function buildAuthorizationUrl(state: string, nonce: string): Promise<string> {
  const { authorization_endpoint } = await getDiscovery();
  // ProConnect rejects any parameter beyond the documented set (error Y000400), so keep this exact.
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("PROCONNECT_CLIENT_ID"),
    redirect_uri: redirectUri(),
    scope: SCOPE,
    state,
    nonce,
  });
  return `${authorization_endpoint}?${params}`;
}

export type ProConnectUser = { email: string; name: string; idToken: string };

/**
 * Exchanges the authorization code for tokens, verifies the id_token (and its nonce),
 * then fetches and verifies the signed userinfo JWT. Returns the agent's identity.
 */
export async function exchangeCodeAndFetchUser(
  code: string,
  expectedNonce: string,
): Promise<ProConnectUser> {
  const discovery = await getDiscovery();
  const clientId = requireEnv("PROCONNECT_CLIENT_ID");
  const jwks = getJwks(discovery.jwks_uri);

  const tokenRes = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      client_id: clientId,
      client_secret: requireEnv("PROCONNECT_CLIENT_SECRET"),
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(
      `ProConnect token endpoint failed: ${tokenRes.status} ${await tokenRes.text()}`,
    );
  }
  const tokens = (await tokenRes.json()) as { access_token: string; id_token: string };

  const { payload: idClaims } = await jwtVerify(tokens.id_token, jwks, {
    issuer: discovery.issuer,
    audience: clientId,
  });
  if (idClaims.nonce !== expectedNonce) {
    throw new Error("ProConnect nonce mismatch");
  }

  // userinfo is returned as a signed JWT; verify it and bind it to the id_token subject.
  const userinfoRes = await fetch(discovery.userinfo_endpoint, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userinfoRes.ok) {
    throw new Error(`ProConnect userinfo endpoint failed: ${userinfoRes.status}`);
  }
  const { payload: claims } = await jwtVerify(await userinfoRes.text(), jwks, {
    issuer: discovery.issuer,
  });
  if (claims.sub !== idClaims.sub) {
    throw new Error("ProConnect userinfo subject mismatch");
  }

  const email = typeof claims.email === "string" ? claims.email : "";
  if (!email) throw new Error("ProConnect did not return an email");
  const name = [claims.given_name, claims.usual_name]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");

  return { email, name, idToken: tokens.id_token };
}

export async function buildLogoutUrl(idToken: string, state: string): Promise<string> {
  const { end_session_endpoint } = await getDiscovery();
  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: `${getBaseUrl()}${POST_LOGOUT_PATH}`,
    state,
  });
  return `${end_session_endpoint}?${params}`;
}
