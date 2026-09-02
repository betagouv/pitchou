import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { post, responseJson } = vi.hoisted(() => ({
  post: vi.fn(),
  responseJson: vi.fn(),
}));

vi.mock("ky", () => ({ default: { post } }));

import { isDefinitiveEmailSendFailure, sendEmail } from "./emails.ts";

const initialApiKey = process.env.BREVO_API_KEY;

beforeEach(() => {
  process.env.BREVO_API_KEY = "test-api-key";
  responseJson.mockResolvedValue({ messageId: "test-message" });
  post.mockReturnValue({ json: responseJson });
});

afterEach(() => {
  vi.clearAllMocks();
  if (initialApiKey === undefined) delete process.env.BREVO_API_KEY;
  else process.env.BREVO_API_KEY = initialApiKey;
});

test("envoie un email HTML avec copies, adresse de réponse et pièces jointes", async () => {
  await sendEmail({
    to: ["cnpn@example.com"],
    cc: ["instructeur@example.com", "cheffe@example.com"],
    replyTo: "instructeur@example.com",
    subject: "Saisine du CNPN",
    htmlContent: "<p>Bonjour</p>",
    attachments: [{ name: "saisine.pdf", content: Buffer.from("contenu") }],
  });

  expect(post).toHaveBeenCalledWith("https://api.brevo.com/v3/smtp/email", {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": "test-api-key",
    },
    json: {
      sender: { name: "Pitchou", email: "pitchou@beta.gouv.fr" },
      to: [{ email: "cnpn@example.com" }],
      cc: [{ email: "instructeur@example.com" }, { email: "cheffe@example.com" }],
      replyTo: { email: "instructeur@example.com" },
      subject: "Saisine du CNPN",
      htmlContent: "<p>Bonjour</p>",
      attachment: [{ name: "saisine.pdf", content: Buffer.from("contenu").toString("base64") }],
    },
  });
});

test("refuse l'envoi sans clé Brevo", () => {
  delete process.env.BREVO_API_KEY;

  expect(() =>
    sendEmail({ to: ["instructeur@example.com"], subject: "Test", htmlContent: "Bonjour" }),
  ).toThrow("Missing BREVO_API_KEY environment variable");
});

test("distingue un refus Brevo d'un résultat réseau incertain", () => {
  expect(isDefinitiveEmailSendFailure({ response: { status: 400 } })).toBe(true);
  expect(isDefinitiveEmailSendFailure({ response: { status: 408 } })).toBe(false);
  expect(isDefinitiveEmailSendFailure({ response: { status: 500 } })).toBe(false);
  expect(isDefinitiveEmailSendFailure(new TypeError("fetch failed"))).toBe(false);
});
