import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { post, responseJson } = vi.hoisted(() => ({
  post: vi.fn(),
  responseJson: vi.fn(),
}));

vi.mock("ky", () => ({ default: { post } }));

import { isDefinitiveEmailSendFailure, sendCnpnEmailReadReceipt, sendEmail } from "./emails.ts";

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
    tags: ["cnpn-saisine"],
  });

  expect(post).toHaveBeenCalledWith("https://api.brevo.com/v3/smtp/email", {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": "test-api-key",
    },
    json: {
      sender: { name: "Pitchou", email: "contact@pitchou.beta.gouv.fr" },
      to: [{ email: "cnpn@example.com" }],
      cc: [{ email: "instructeur@example.com" }, { email: "cheffe@example.com" }],
      replyTo: { email: "instructeur@example.com" },
      subject: "Saisine du CNPN",
      htmlContent: "<p>Bonjour</p>",
      tags: ["cnpn-saisine"],
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

test("envoie l'accusé de lecture au gestionnaire", async () => {
  await sendCnpnEmailReadReceipt("instructeur@example.com", {
    eventId: "11111111-1111-4111-8111-111111111111",
    dossierId: 42,
    originalSubject: "Saisine <CNPN>",
  });

  expect(post).toHaveBeenCalledWith(
    "https://api.brevo.com/v3/smtp/email",
    expect.objectContaining({
      json: {
        sender: { name: "Pitchou", email: "contact@pitchou.beta.gouv.fr" },
        to: [{ email: "instructeur@example.com" }],
        subject: "Accusé de lecture de votre saisine CNPN - dossier 42",
        htmlContent:
          "<p>Le secrétariat du CNPN a ouvert le mail de saisine que vous avez envoyé via Pitchou pour le dossier 42.</p><p><strong>Objet du mail :</strong> Saisine &lt;CNPN&gt;</p>",
        tags: ["cnpn-read-receipt"],
        headers: { idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) },
      },
    }),
  );
  expect(post.mock.calls[0]?.[1].json.headers.idempotencyKey).not.toBe(
    "11111111-1111-4111-8111-111111111111",
  );
});

test("considère un doublon d'idempotence comme un accusé déjà envoyé", async () => {
  responseJson.mockRejectedValueOnce(
    Object.assign(new Error("Bad request"), {
      response: new Response(JSON.stringify({ code: "duplicate_parameter" }), { status: 400 }),
      data: { code: "duplicate_parameter" },
    }),
  );

  await expect(
    sendCnpnEmailReadReceipt("instructeur@example.com", {
      eventId: "11111111-1111-4111-8111-111111111111",
      dossierId: 42,
      originalSubject: "Saisine CNPN",
    }),
  ).resolves.toEqual({ messageId: "11111111-1111-4111-8111-111111111111" });
});
