import { expect, test } from "vitest";
import { notificationErrorCategory, providerMessageId } from "./failures.ts";
import { evenementMetriqueGuard } from "../evenements_metriques.ts";

test.each([
  [429, "rate_limited"],
  [401, "authentication"],
  [403, "authentication"],
  [408, "timeout"],
  [503, "provider_unavailable"],
  [400, "provider_rejected"],
])("normalizes status %s without leaking provider contents", (status, expected) => {
  expect(
    notificationErrorCategory({
      response: new Response("secret API key user@test.fr", { status: Number(status) }),
    }),
  ).toBe(expected);
});
test("normalizes configuration, timeouts, network failures and unknown values", () => {
  expect(notificationErrorCategory(new Error("Missing BREVO_API_KEY environment variable"))).toBe(
    "configuration",
  );
  expect(notificationErrorCategory(new DOMException("secret", "AbortError"))).toBe("timeout");
  expect(notificationErrorCategory(new TypeError("secret"))).toBe("network");
  expect(notificationErrorCategory("secret")).toBe("unknown");
  expect(providerMessageId({ messageId: "accepted-id" })).toBe("accepted-id");
  expect(providerMessageId({ raw: "secret" })).toBeNull();
});
test.each([
  "notificationEmailSettingsChanged",
  "notificationEmailQueued",
  "notificationEmailSent",
  "notificationEmailFailed",
  "notificationEmailCancelled",
  "notificationEmailUncertain",
])("client metrics cannot forge server event %s", (type) => {
  expect(evenementMetriqueGuard({ type, details: {} })).toBe(false);
});
