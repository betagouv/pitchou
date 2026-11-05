import { SignJWT, jwtVerify } from "jose";
import type { Cookies } from "@sveltejs/kit";
import { requireEnv } from "../env.ts";

const NAME = "__Host-pitchou_login_bridge";
const key = () => new TextEncoder().encode(requireEnv("ADMIN_SESSION_SECRET"));
type BrowserTransaction = { state: string; verifier: string; redirectTo: string };

export async function setBrowserTransaction(cookies: Cookies, tx: BrowserTransaction) {
  const token = await new SignJWT({ ...tx })
    .setProtectedHeader({ alg: "HS256", typ: "pitchou-bridge-cookie" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key());
  cookies.set(NAME, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
  });
}

export async function takeBrowserTransaction(cookies: Cookies): Promise<BrowserTransaction | null> {
  const token = cookies.get(NAME);
  cookies.delete(NAME, { path: "/", secure: true });
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
      typ: "pitchou-bridge-cookie",
      maxTokenAge: "10m",
      requiredClaims: ["exp", "iat"],
    });
    if (
      typeof payload.state !== "string" ||
      typeof payload.verifier !== "string" ||
      typeof payload.redirectTo !== "string"
    )
      return null;
    return { state: payload.state, verifier: payload.verifier, redirectTo: payload.redirectTo };
  } catch {
    return null;
  }
}
