import { createHash, randomBytes } from "node:crypto";
import { EncryptJWT, jwtDecrypt, jwtVerify, SignJWT } from "jose";
import type { ProConnectUser } from "@pitchou/server/proconnect.ts";
import type { BridgeClient, BridgeTransaction } from "./config.ts";

const REQUEST_TYPE = "pitchou-login-request";
const HANDOFF_TYPE = "pitchou-login-handoff";
export const randomValue = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value).digest("base64url");
const key = (client: BridgeClient) => Buffer.from(client.secret, "hex");
const isToken = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/u.test(value);

export async function createRequest(
  client: BridgeClient,
  broker: string,
  state: string,
  verifier: string,
) {
  return new SignJWT({ state, challenge: digest(verifier) })
    .setProtectedHeader({ alg: "HS256", typ: REQUEST_TYPE })
    .setIssuer(client.origin)
    .setAudience(broker)
    .setSubject(client.id)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(key(client));
}

export async function verifyRequest(client: BridgeClient, broker: string, token: string) {
  const { payload } = await jwtVerify(token, key(client), {
    algorithms: ["HS256"],
    typ: REQUEST_TYPE,
    issuer: client.origin,
    audience: broker,
    subject: client.id,
    maxTokenAge: "60s",
    requiredClaims: ["exp", "iat", "sub"],
  });
  if (!isToken(payload.state) || !isToken(payload.challenge)) throw new Error("Invalid request.");
  return { client: client.id, state: payload.state, challenge: payload.challenge };
}

export async function createHandoff(
  client: BridgeClient,
  broker: string,
  tx: BridgeTransaction,
  user: ProConnectUser,
) {
  return new EncryptJWT({
    state: tx.state,
    challenge: tx.challenge,
    identity: {
      issuer: user.issuer,
      subject: user.subject,
      email: user.email,
      firstNames: user.firstNames,
      lastName: user.lastName,
    },
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: HANDOFF_TYPE })
    .setIssuer(broker)
    .setAudience(client.origin)
    .setSubject(client.id)
    .setJti(randomValue())
    .setIssuedAt()
    .setExpirationTime("60s")
    .encrypt(key(client));
}

export async function verifyHandoff(
  client: BridgeClient,
  broker: string,
  token: string,
  state: string,
  verifier: string,
) {
  const { payload } = await jwtDecrypt(token, key(client), {
    keyManagementAlgorithms: ["dir"],
    contentEncryptionAlgorithms: ["A256GCM"],
    typ: HANDOFF_TYPE,
    issuer: broker,
    audience: client.origin,
    subject: client.id,
    maxTokenAge: "60s",
    requiredClaims: ["exp", "iat", "jti", "sub"],
  });
  if (payload.state !== state || payload.challenge !== digest(verifier) || !isToken(payload.jti))
    throw new Error("Login handoff does not match this browser.");
  const identity = payload.identity as Record<string, unknown> | undefined;
  if (
    !identity ||
    !["issuer", "subject", "email", "firstNames", "lastName"].every(
      (field) => typeof identity[field] === "string" && identity[field].length <= 1024,
    ) ||
    !identity.issuer ||
    !identity.subject ||
    !identity.email
  )
    throw new Error("Invalid login identity.");
  return {
    id: payload.jti,
    expiresAt: new Date(payload.exp! * 1000),
    identity: identity as {
      issuer: string;
      subject: string;
      email: string;
      firstNames: string;
      lastName: string;
    },
  };
}
