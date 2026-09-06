import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";

import DossierHistorique from "./DossierHistorique.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
import type { DossierCnpnEmailSentEvent, DossierFull } from "@pitchou/types/API_Pitchou.ts";

afterEach(() => {
  cleanup();
  store.capabilities = {};
});

test.each([false, true])("renders CNPN emails with tracking available: %s", async (tracked) => {
  store.capabilities = { listerActionsDossier: vi.fn().mockResolvedValue([]) };
  const event: DossierCnpnEmailSentEvent = {
    id: "email-1",
    dossier: 123 as DossierFull["id"],
    sent_by_email: "claire.morin@example.com",
    sent_at: "2026-08-01T10:00:00Z",
    delivered_at: tracked ? "2026-08-01T10:01:00Z" : null,
    opened_at: tracked ? "2026-08-02T09:00:00Z" : null,
    recipient_email: "cnpn@example.com",
    cc_emails: [],
    subject: "Saisine CNPN du dossier test",
    attachment_ids: [],
    attachment_names: ["saisine.pdf", "projet.pdf"],
  };
  const dossier = {
    id: event.dossier,
    source: "pitchou",
    depot_date: new Date("2026-01-15"),
    public_consultation_start_date: null,
    public_consultation_end_date: null,
    cnpnEmailSentEvents: [event],
  } as DossierFull;

  render(DossierHistorique, { dossier });

  await expect.element(await screen.findByText(event.subject)).toBeVisible();
  expect(store.capabilities.listerActionsDossier).toHaveBeenCalledWith(dossier.id);
  const entries = screen.getAllByRole("listitem");
  expect(entries).toHaveLength(2);
  expect(entries[0]).toHaveTextContent("Mail de saisine du CNPN envoyé :");
  expect(entries[0]).toHaveTextContent("2 pièces jointes");
  expect(entries[0]).toHaveTextContent(
    `Le ${formatDateAbsolute(new Date(event.sent_at), "dd/MM/yyyy 'à' HH:mm")} par claire.morin`,
  );
  expect(entries[1]).toHaveTextContent("Dossier créé dans Pitchou");

  if (tracked) {
    for (const [label, date] of [
      ["Distribué au destinataire", event.delivered_at],
      ["Ouverture détectée", event.opened_at],
    ] as const) {
      expect(entries[0]).toHaveTextContent(
        `${label} le ${formatDateAbsolute(new Date(date!), "dd/MM/yyyy 'à' HH:mm")}`,
      );
    }
  } else {
    expect(screen.queryByText(/Distribué au destinataire/)).toBeNull();
    expect(screen.queryByText(/Ouverture détectée/)).toBeNull();
  }
});
