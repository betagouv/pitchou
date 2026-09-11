import { describe, expect, test } from "vitest";

import { historiqueEntries } from "./display.ts";
import type { DossierCnpnEmailSentEvent, DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierAction } from "@pitchou/types/capabilities.ts";

function dossierWithSource(source: string): DossierFull {
  return {
    depot_date: new Date("2026-01-15"),
    source,
    public_consultation_start_date: null,
    public_consultation_end_date: null,
  } as unknown as DossierFull;
}

function depotEntry(source: string) {
  return historiqueEntries([], dossierWithSource(source)).find(({ id }) => id === "virtual-depot");
}

describe("historique — entrée de dépôt", () => {
  test.each([
    ["demarche_numerique", "Dossier déposé sur Démarches Numériques", "petitionnaire"],
    ["pitchou", "Dossier créé dans Pitchou", "system"],
    ["gunenv", "Dossier importé depuis GunEnv", "system"],
    ["onagre", "Dossier importé depuis Onagre", "system"],
    ["import_fichier", "Dossier importé depuis un fichier du service", "system"],
    ["unknown", "Dossier importé dans Pitchou", "system"],
  ])("source %s → « %s »", (source, label, tone) => {
    const entry = depotEntry(source);
    expect(entry?.label).toBe(label);
    expect(entry?.tone).toBe(tone);
  });
});

describe("CNPN email history", () => {
  function emailEvent(
    overrides: Partial<DossierCnpnEmailSentEvent> = {},
  ): DossierCnpnEmailSentEvent {
    return {
      id: "email-1",
      dossier: 123 as DossierFull["id"],
      sent_by_email: "claire.morin@example.com",
      sent_at: "2026-08-01T10:00:00Z",
      delivered_at: null,
      opened_at: null,
      recipient_email: "cnpn@example.com",
      cc_emails: [],
      subject: "Saisine CNPN du dossier test",
      attachment_ids: [],
      attachment_names: ["saisine.pdf"],
      ...overrides,
    };
  }

  test.each([
    [[], undefined],
    [["saisine.pdf"], " · 1 pièce jointe"],
    [["saisine.pdf", "projet.pdf"], " · 2 pièces jointes"],
  ])(
    "displays the subject, sender and attachment count for %j",
    (attachment_names, valueSuffix) => {
      const dossier = dossierWithSource("pitchou");
      dossier.cnpnEmailSentEvents = [emailEvent({ attachment_names })];

      expect(historiqueEntries([], dossier)[0]).toEqual({
        id: "cnpn-email-email-1",
        icon: "fr-icon-mail-line",
        tone: "instructeur",
        label: "Mail de saisine du CNPN envoyé :",
        value: "Saisine CNPN du dossier test",
        valueSuffix,
        date: new Date("2026-08-01T10:00:00Z"),
        timeKnown: true,
        author: "par claire.morin",
        statuses: [],
      });
    },
  );

  test("converts delivery and opening timestamps and keeps their order", () => {
    const dossier = dossierWithSource("pitchou");
    dossier.cnpnEmailSentEvents = [
      emailEvent({
        sent_at: new Date("2026-08-01T10:00:00Z"),
        delivered_at: "2026-08-01T10:01:00Z",
        opened_at: new Date("2026-08-02T09:00:00Z"),
        sent_by_email: null,
      }),
    ];

    expect(historiqueEntries([], dossier)[0]).toMatchObject({
      date: new Date("2026-08-01T10:00:00Z"),
      author: undefined,
      statuses: [
        {
          icon: "fr-icon-checkbox-circle-line",
          label: "Distribué au destinataire",
          date: new Date("2026-08-01T10:01:00Z"),
        },
        {
          icon: "fr-icon-eye-line",
          label: "Ouverture détectée",
          date: new Date("2026-08-02T09:00:00Z"),
        },
      ],
    });
  });

  test("shows opening tracking even without a delivery timestamp", () => {
    const dossier = dossierWithSource("pitchou");
    dossier.cnpnEmailSentEvents = [emailEvent({ opened_at: "2026-08-02T09:00:00Z" })];

    expect(historiqueEntries([], dossier)[0].statuses).toEqual([
      {
        icon: "fr-icon-eye-line",
        label: "Ouverture détectée",
        date: new Date("2026-08-02T09:00:00Z"),
      },
    ]);
  });

  test("sorts emails by sent date alongside actions and milestones with distinct IDs", () => {
    const dossier = dossierWithSource("pitchou");
    dossier.cnpnEmailSentEvents = [
      emailEvent({ opened_at: "2026-08-03T10:00:00Z" }),
      emailEvent({ id: "email-2", sent_at: "2026-08-02T10:00:00Z" }),
    ];
    const action = {
      id: "email-1",
      type: "saisine_importee",
      created_at: "2026-08-01T12:00:00Z",
      author_email: null,
      author_petitionnaire: false,
      data: {},
    } as DossierAction;

    expect(historiqueEntries([action], dossier).map(({ id }) => id)).toEqual([
      "cnpn-email-email-2",
      "email-1",
      "cnpn-email-email-1",
      "virtual-depot",
    ]);
  });
});
