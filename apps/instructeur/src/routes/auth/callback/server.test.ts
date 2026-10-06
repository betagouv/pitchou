import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  clear: vi.fn(),
  cookie: vi.fn(),
  exchange: vi.fn(),
  connect: vi.fn(),
  sessionUser: vi.fn(),
  createSession: vi.fn(),
}));
vi.mock("$lib/server/session.ts", () => ({
  readTransaction: mocks.transaction,
  clearTransaction: mocks.clear,
  setSessionCookie: mocks.cookie,
}));
vi.mock("$lib/server/proconnect.ts", () => ({ exchangeCodeAndFetchUser: mocks.exchange }));
vi.mock("@pitchou/server/users.ts", () => ({
  connectUser: mocks.connect,
  getSessionUser: mocks.sessionUser,
}));
vi.mock("@pitchou/server/session.ts", () => ({ createSession: mocks.createSession }));
import { GET } from "./+server.ts";
const identity = {
  issuer: "https://proconnect.test",
  subject: "subject",
  email: "agent@example.org",
  firstNames: "Camille",
  lastName: "Martin",
  name: "Camille Martin",
  idToken: "signed-token",
};
function callback(state = "state") {
  return GET({
    url: new URL(`http://localhost/auth/callback?code=code&state=${state}`),
    cookies: {},
  } as Parameters<typeof GET>[0]);
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockResolvedValue({
    state: "state",
    nonce: "nonce",
    redirectTo: "/tableau-de-suivi",
  });
  mocks.exchange.mockResolvedValue(identity);
  mocks.connect.mockResolvedValue({ id: 7, active: true });
  mocks.createSession.mockResolvedValue("session");
  mocks.sessionUser.mockResolvedValue({
    groupes: [{ id: "group" }],
    permissions: ["dossier:read", "dossier:instruct"],
  });
});
test("an instructor can sign in without admin permission", async () => {
  await expect(callback()).rejects.toMatchObject({ status: 303, location: "/tableau-de-suivi" });
  expect(mocks.connect).toHaveBeenCalledWith(identity);
  expect(mocks.createSession).toHaveBeenCalledWith({
    userId: 7,
    email: identity.email,
    name: identity.name,
    idToken: identity.idToken,
  });
  expect(mocks.cookie).toHaveBeenCalledWith({}, "session");
});
test("a first login is recorded even when the account awaits access", async () => {
  mocks.sessionUser.mockResolvedValue({ groupes: [], permissions: [] });
  await expect(callback()).rejects.toMatchObject({ status: 303, location: "/auth/acces-refuse" });
  expect(mocks.connect).toHaveBeenCalledOnce();
  expect(mocks.createSession).toHaveBeenCalledOnce();
});
test("disabled accounts cannot create sessions", async () => {
  mocks.connect.mockResolvedValue({ id: 7, active: false });
  await expect(callback()).rejects.toMatchObject({
    status: 303,
    location: "/auth/acces-refuse?reason=disabled",
  });
  expect(mocks.cookie).not.toHaveBeenCalled();
  expect(mocks.createSession).not.toHaveBeenCalled();
});
test("invalid state never exchanges the authorization code", async () => {
  await expect(callback("wrong")).rejects.toMatchObject({ status: 400 });
  expect(mocks.exchange).not.toHaveBeenCalled();
  expect(mocks.clear).toHaveBeenCalledOnce();
});
test("a callback without its transaction cookie cannot be replayed", async () => {
  mocks.transaction.mockResolvedValue(null);
  await expect(callback()).rejects.toMatchObject({ status: 400 });
  expect(mocks.connect).not.toHaveBeenCalled();
});
