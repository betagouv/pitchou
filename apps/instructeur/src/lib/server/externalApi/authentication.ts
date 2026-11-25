import { createRemoteJWKSet, errors, jwtVerify } from "jose";

const maximumTokenAge = 600;

function readHttpsUrl(value: string | undefined) {
  if (!value) throw new Error("Missing OAuth URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Expected an HTTPS OAuth URL without credentials, query or fragment");
  }
  return url;
}

function configureVerifier() {
  const { EXTERNAL_API_ISSUER: issuer, EXTERNAL_API_AUDIENCE: audience } = process.env;
  if (!issuer || !audience) throw new Error("Missing external API OAuth issuer or audience");
  readHttpsUrl(issuer);
  const keys = createRemoteJWKSet(readHttpsUrl(process.env.EXTERNAL_API_JWKS_URL));
  return (token: string) =>
    jwtVerify(token, keys, {
      algorithms: ["RS256", "ES256"],
      typ: "at+jwt",
      issuer,
      audience,
      requiredClaims: ["sub", "client_id", "exp", "iat", "jti"],
      maxTokenAge: maximumTokenAge,
      clockTolerance: 15,
    });
}

let verifyToken: ReturnType<typeof configureVerifier> | undefined;

export async function verifyExternalApiToken(token: string) {
  verifyToken ??= configureVerifier();
  try {
    const { payload } = await verifyToken(token);
    const { client_id: clientId, sub, jti, exp, iat, scope } = payload;
    if (
      typeof clientId !== "string" ||
      !clientId ||
      clientId.length > 255 ||
      sub !== clientId ||
      typeof jti !== "string" ||
      !jti ||
      exp == null ||
      iat == null ||
      exp <= iat ||
      exp - iat > maximumTokenAge ||
      (scope != null && typeof scope !== "string")
    )
      return null;
    return { clientId, scopes: new Set(typeof scope === "string" ? scope.split(" ") : []) };
  } catch (error) {
    if (
      error instanceof errors.JWTExpired ||
      error instanceof errors.JWTClaimValidationFailed ||
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSInvalid ||
      error instanceof errors.JOSEAlgNotAllowed ||
      error instanceof errors.JWKSNoMatchingKey ||
      error instanceof errors.JWSSignatureVerificationFailed
    )
      return null;
    throw error;
  }
}
