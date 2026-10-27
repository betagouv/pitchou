import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { page } from "vitest/browser";
import DossierAvis from "./DossierAvis.svelte";
import { dossier as fixture, saisineId } from "./CnpnEmailModal/fixtures.ts";
import type { DossierCnpnEmailSentEvent } from "@pitchou/types/API_Pitchou.ts";

vi.mock("$app/env/public", () => ({ PUBLIC_PITCHOU_ENV: "" }));
vi.mock("#lib/dossier/dossier.ts", () => ({
  refreshDossierFull: vi.fn(),
  recordLocalWrite: vi.fn(),
}));
vi.mock("#lib/shared/aarri.ts", () => ({ sendEvenement: vi.fn() }));
afterEach(cleanup);

function event(overrides: Partial<DossierCnpnEmailSentEvent> = {}): DossierCnpnEmailSentEvent {
  return {
    id: "original",
    dossier: fixture.id,
    sent_by_email: "sender@example.com",
    sent_at: "2026-10-23T12:35:24Z",
    recipient_email: "cnpn@example.com",
    cc_emails: [],
    subject: "Saisine Cernay",
    attachment_ids: [saisineId],
    attachment_names: ["saisine.pdf"],
    delivered_at: null,
    opened_at: null,
    delivery_failed_at: "2026-10-23T12:35:25Z",
    delivery_failure_reason: "552 5.3.4 Error: message file too big",
    ...overrides,
  };
}

test("shows the latest email even when a successful resend replaces the saisine attachment with a link", async () => {
  const original = event();
  const dossier = { ...fixture, cnpnEmailSentEvents: [original] };
  const view = render(DossierAvis, { dossier, email: "sender@example.com", followers: [] });
  await expect.element(page.getByRole("alert")).toMatchTextContent("552 5.3.4");
  const resent = event({
    id: "resent",
    sent_at: "2026-10-24T10:00:00Z",
    attachment_ids: [],
    attachment_names: [],
    delivered_at: "2026-10-24T10:01:00Z",
    opened_at: "2026-10-24T11:00:00Z",
    delivery_failed_at: null,
    delivery_failure_reason: null,
  });
  // Deliberately unsorted to verify that the UI selects the latest send itself.
  await view.rerender({ dossier: { ...dossier, cnpnEmailSentEvents: [original, resent] } });
  await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("region", { name: "Suivi du dernier mail CNPN" }))
    .toMatchTextContent("24 octobre 2026");
  expect(page.getByText("23 octobre 2026").elements()).toHaveLength(0);
});

test("tracks a first link-only send and says that missing opening detection is unknown", async () => {
  render(DossierAvis, {
    dossier: {
      ...fixture,
      cnpnEmailSentEvents: [
        event({
          attachment_ids: [],
          attachment_names: [],
          delivery_failed_at: null,
          delivery_failure_reason: null,
        }),
      ],
    },
    email: "sender@example.com",
    followers: [],
  });
  await expect
    .element(page.getByRole("heading", { name: "Dernier mail de saisine CNPN" }))
    .toBeVisible();
  await expect.element(page.getByText("Aucune ouverture détectée")).toBeVisible();
  await expect.element(page.getByText(/L'absence de détection ne signifie pas/u)).toBeVisible();
});
