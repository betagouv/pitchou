import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TEST_EMAIL_ENVIRONMENT } from "../../../../apps/instructeur/tests/setup/emailEnvironment.ts";

const { post, json, reportBrevoSendFailure } = vi.hoisted(() => ({
  post: vi.fn(),
  json: vi.fn(),
  reportBrevoSendFailure: vi.fn(),
}));
vi.mock("ky", () => ({ default: { post } }));
vi.mock("./sendFailure.ts", () => ({ reportBrevoSendFailure }));
import { sendBrevoEmail } from "./delivery.ts";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "");
  vi.stubEnv("BREVO_API_KEY", "inherited-live-key");
  vi.stubEnv("MAILPIT_URL", "");
  vi.stubEnv("PITCHOU_EMAIL_DELIVERY_DISABLED", "");
  post.mockReset().mockReturnValue({ json });
  json.mockReset().mockResolvedValue({ messageId: "sent" });
  reportBrevoSendFailure.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

test("test server overrides prevent all delivery despite inherited credentials and capture settings", () => {
  const inherited = { BREVO_API_KEY: "inherited-live-key", MAILPIT_URL: "http://127.0.0.1:8025" };
  const environment = { ...inherited, ...TEST_EMAIL_ENVIRONMENT };
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  try {
    expect(() => sendBrevoEmail({ to: [{ email: "member-two@test.fr" }] })).toThrow(
      "delivery is disabled",
    );
    expect(post).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

test("reports API errors while preserving the original failure if alerting also fails", async () => {
  const failure = new TypeError("network failure");
  json.mockRejectedValue(failure);
  reportBrevoSendFailure.mockRejectedValue(new Error("alert failed"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const payload = { to: [{ email: "recipient@example.com" }], subject: "Saisine" };
    await expect(sendBrevoEmail(payload)).rejects.toBe(failure);
    expect(reportBrevoSendFailure).toHaveBeenCalledWith(payload, failure);
  } finally {
    log.mockRestore();
  }
});

test("a technical alert failure never generates another technical alert", async () => {
  json.mockRejectedValue(new Error("Brevo unavailable"));
  await expect(sendBrevoEmail({ tags: ["pitchou-email-issue"] })).rejects.toThrow("unavailable");
  expect(reportBrevoSendFailure).not.toHaveBeenCalled();
});
