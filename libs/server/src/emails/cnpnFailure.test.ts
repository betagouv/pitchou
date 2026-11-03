import { beforeEach, expect, test, vi } from "vitest";

vi.mock("../emails.ts", () => ({
  sendEmail: vi.fn(),
  isBrevoDuplicateIdempotencyError: vi.fn(),
}));
import { sendEmail, isBrevoDuplicateIdempotencyError } from "../emails.ts";
import { sendCnpnEmailDeliveryFailure } from "./cnpnFailure.ts";

const context = {
  eventId: "11111111-1111-4111-8111-111111111111",
  dossierId: 42,
  subject: "Saisine <CNPN>",
  reason: "552 5.3.4 Error: message file too big <script>test()</script>",
};

beforeEach(() => {
  vi.mocked(sendEmail).mockReset().mockResolvedValue({ messageId: "notification-id" });
  vi.mocked(isBrevoDuplicateIdempotencyError).mockReset().mockResolvedValue(false);
});

test("alerts only the sender, escapes external content and reuses a separate idempotency key", async () => {
  await sendCnpnEmailDeliveryFailure("sender@test.fr", context);
  await sendCnpnEmailDeliveryFailure("sender@test.fr", context);
  const email = vi.mocked(sendEmail).mock.calls[0][0];
  expect(email.to).toEqual(["sender@test.fr"]);
  expect(email.subject).toContain("Échec de livraison");
  expect(email.htmlContent).toContain("Saisine &lt;CNPN&gt;");
  expect(email.htmlContent).toContain("552 5.3.4");
  expect(email.htmlContent).not.toContain("<script>");
  expect(email.headers?.idempotencyKey).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/u,
  );
  expect(email.headers?.idempotencyKey).not.toBe(context.eventId);
  expect(vi.mocked(sendEmail).mock.calls[1][0].headers).toEqual(email.headers);
});

test("accepts Brevo's duplicate response, but propagates a real sending failure", async () => {
  vi.mocked(sendEmail).mockRejectedValue(new Error("Brevo error"));
  vi.mocked(isBrevoDuplicateIdempotencyError).mockResolvedValueOnce(true);
  await expect(sendCnpnEmailDeliveryFailure("sender@test.fr", context)).resolves.toEqual({
    messageId: context.eventId,
  });
  await expect(sendCnpnEmailDeliveryFailure("sender@test.fr", context)).rejects.toThrow(
    "Brevo error",
  );
});
