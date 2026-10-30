import { expect, test } from "vitest";
import { emailStatusLabel } from "./labels.ts";

const accepted = {
  source: "cnpn",
  status: "sent",
  sent_at: new Date(),
  delivered_at: null,
  opened_at: null,
};

test("distinguishes Brevo acceptance, delivery failure, delivery and opening", () => {
  expect(emailStatusLabel(accepted)).toBe("Pris en charge par Brevo");
  expect(emailStatusLabel({ ...accepted, status: "failed" })).toBe("Échec de livraison");
  expect(emailStatusLabel({ ...accepted, status: "failed", sent_at: null })).toBe("Échec");
  expect(emailStatusLabel({ ...accepted, delivered_at: new Date() })).toBe(
    "Distribué au destinataire",
  );
  expect(emailStatusLabel({ ...accepted, opened_at: new Date() })).toBe("Ouverture détectée");
});

test("labels notification delivery failures separately from API acceptance", () => {
  expect(emailStatusLabel({ ...accepted, source: "notification" })).toBe(
    "Pris en charge par Brevo",
  );
  expect(emailStatusLabel({ ...accepted, source: "notification", status: "failed" })).toBe(
    "Échec de livraison signalé",
  );
});
