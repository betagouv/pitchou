import { afterEach, expect, test, vi } from "vitest";
import {
  createHandoff,
  createRequest,
  digest,
  randomValue,
  verifyHandoff,
  verifyRequest,
} from "./tokens.ts";

const client = {
  id: "onagre-workspace",
  origin: "https://onagre.example.fr",
  secret: "ab".repeat(32),
};
const broker = "https://staging.admin.example.fr";
const user = {
  issuer: "https://proconnect.example.fr",
  subject: "subject-1",
  email: "team@example.fr",
  firstNames: "Test",
  lastName: "User",
  name: "Test User",
  idToken: "provider-token-must-not-leave-broker",
};
afterEach(() => vi.useRealTimers());

test("authenticated requests bind the client, broker, browser state and verifier", async () => {
  const state = randomValue(),
    verifier = randomValue();
  const request = await createRequest(client, broker, state, verifier);
  expect(await verifyRequest(client, broker, request)).toEqual({
    client: client.id,
    state,
    challenge: digest(verifier),
  });
  await expect(verifyRequest({ ...client, id: "other" }, broker, request)).rejects.toThrow();
  await expect(verifyRequest(client, "https://other.example.fr", request)).rejects.toThrow();
  await expect(
    verifyRequest({ ...client, secret: "cd".repeat(32) }, broker, request),
  ).rejects.toThrow();
  await expect(verifyRequest(client, broker, request + "changed")).rejects.toThrow();
});

test("requests expire after sixty seconds", async () => {
  vi.useFakeTimers();
  const request = await createRequest(client, broker, randomValue(), randomValue());
  vi.advanceTimersByTime(61_000);
  await expect(verifyRequest(client, broker, request)).rejects.toThrow();
});

test("encrypted handoffs expose only the required identity to their intended browser and client", async () => {
  const state = randomValue(),
    verifier = randomValue();
  const ticket = await createHandoff(
    client,
    broker,
    { client: client.id, state, challenge: digest(verifier) },
    user,
  );
  expect(ticket).not.toContain(user.email);
  const result = await verifyHandoff(client, broker, ticket, state, verifier);
  expect(result.identity).toEqual({
    issuer: user.issuer,
    subject: user.subject,
    email: user.email,
    firstNames: user.firstNames,
    lastName: user.lastName,
  });
  expect(result).not.toHaveProperty("idToken");
  await expect(verifyHandoff(client, broker, ticket, randomValue(), verifier)).rejects.toThrow();
  await expect(verifyHandoff(client, broker, ticket, state, randomValue())).rejects.toThrow();
  await expect(
    verifyHandoff(
      { ...client, origin: "https://other.example.fr" },
      broker,
      ticket,
      state,
      verifier,
    ),
  ).rejects.toThrow();
  await expect(
    verifyHandoff({ ...client, secret: "cd".repeat(32) }, broker, ticket, state, verifier),
  ).rejects.toThrow();
  await expect(
    verifyHandoff(client, "https://other.example.fr", ticket, state, verifier),
  ).rejects.toThrow();
  await expect(
    verifyHandoff(client, broker, ticket + "changed", state, verifier),
  ).rejects.toThrow();
});

test("expired handoffs and empty identities are rejected", async () => {
  vi.useFakeTimers();
  const state = randomValue(),
    verifier = randomValue();
  const tx = { client: client.id, state, challenge: digest(verifier) };
  const invalid = await createHandoff(client, broker, tx, { ...user, subject: "" });
  await expect(verifyHandoff(client, broker, invalid, state, verifier)).rejects.toThrow();
  const ticket = await createHandoff(client, broker, tx, user);
  vi.advanceTimersByTime(61_000);
  await expect(verifyHandoff(client, broker, ticket, state, verifier)).rejects.toThrow();
});
