import { expect, test } from "vitest";

import {
  DEFAULT_MAIL_RECIPIENT,
  MAILTO_URL_MAX_LENGTH,
  bodyFitsInMailtoUrl,
  buildMailtoUrl,
  defaultMailSubject,
  measureMailtoUrl,
  splitSubjectAndBody,
} from "./mail.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

test("construit une URL mailto avec destinataire, objet et corps", () => {
  const url = buildMailtoUrl({
    recipient: DEFAULT_MAIL_RECIPIENT,
    subject: "Saisine CNPN",
    body: "Bonjour,\nVoici la saisine.",
  });

  expect(url.startsWith(`mailto:${DEFAULT_MAIL_RECIPIENT}?`)).toBe(true);

  const parameters = new URLSearchParams(url.slice(url.indexOf("?") + 1));
  expect(parameters.get("subject")).toBe("Saisine CNPN");
  expect(parameters.get("body")).toBe("Bonjour,\nVoici la saisine.");
});

test("encode les espaces en %20 et non en +", () => {
  const url = buildMailtoUrl({ recipient: "a@b.fr", subject: "objet avec espaces", body: "" });

  expect(url).toContain("objet%20avec%20espaces");
  expect(url).not.toContain("+");
});

test("garde l'arobase lisible dans l'adresse du destinataire", () => {
  const url = buildMailtoUrl({ recipient: "a.b@c.gouv.fr", subject: "", body: "" });

  expect(url.startsWith("mailto:a.b@c.gouv.fr?")).toBe(true);
  expect(url).not.toContain("%40");
});

test("compte la longueur codée et non les caractères saisis", () => {
  // Accents et espaces gonflent l'URL : "é" occupe 6 caractères, un espace 3.
  const body = "é ".repeat(100);
  const measure = measureMailtoUrl({ recipient: "a@b.fr", subject: "", body });

  expect(measure.typed).toBe(200);
  expect(measure.encoded).toBeGreaterThan(900);
  expect(measure.limit).toBe(MAILTO_URL_MAX_LENGTH);
});

test("accepte un corps court et refuse un corps trop long", () => {
  const draft = { recipient: DEFAULT_MAIL_RECIPIENT, subject: "Saisine", body: "" };

  expect(bodyFitsInMailtoUrl({ ...draft, body: "Bonjour" })).toBe(true);
  expect(bodyFitsInMailtoUrl({ ...draft, body: "a".repeat(MAILTO_URL_MAX_LENGTH) })).toBe(false);
});

test("retire l'extension et l'horodatage du nom de document pour l'objet", () => {
  const dossier = { name: "Parc éolien de Test" } as unknown as DossierFull;

  expect(defaultMailSubject(dossier, "Mail Saisine CNPN-2026-08-25T14:30.odt")).toBe(
    "Mail Saisine CNPN - Parc éolien de Test",
  );
});

test("se rabat sur le numéro de démarche quand le dossier n'a pas de nom", () => {
  const dossier = {
    name: null,
    demarche_numerique_number: "12345",
  } as unknown as DossierFull;

  expect(defaultMailSubject(dossier, "Fiche synthétique.odt")).toBe("Fiche synthétique - 12345");
});

test("garde le seul nom du document quand le dossier n'a ni nom ni numéro", () => {
  const dossier = { name: null, demarche_numerique_number: null } as unknown as DossierFull;

  expect(defaultMailSubject(dossier, "Fiche synthétique.odt")).toBe("Fiche synthétique");
});

test("utilise la première ligne du document comme objet et la retire du corps", () => {
  const document = "Saisine du CNPN - Parc éolien\n\nBonjour,\n\nVeuillez trouver ci-joint.";

  expect(splitSubjectAndBody(document)).toEqual({
    subject: "Saisine du CNPN - Parc éolien",
    body: "Bonjour,\n\nVeuillez trouver ci-joint.",
  });
});

test("reconnaît une ligne « Objet : » explicite même précédée d'autres lignes", () => {
  const document = "Direction régionale\n\nObjet : Saisine du CNPN\n\nBonjour,";

  expect(splitSubjectAndBody(document)).toEqual({
    subject: "Saisine du CNPN",
    body: "Direction régionale\n\nBonjour,",
  });
});

test("accepte les autres séparateurs après « Objet »", () => {
  expect(splitSubjectAndBody("Objet - Saisine du CNPN\n\nBonjour,").subject).toBe(
    "Saisine du CNPN",
  );
  expect(splitSubjectAndBody("OBJET : Saisine du CNPN\n\nBonjour,").subject).toBe(
    "Saisine du CNPN",
  );
});

test("ignore les lignes vides en tête de document", () => {
  const document = "\n\n   \nSaisine du CNPN\n\nBonjour,";

  expect(splitSubjectAndBody(document)).toEqual({
    subject: "Saisine du CNPN",
    body: "Bonjour,",
  });
});

test("laisse le corps intact quand la première ligne est un paragraphe", () => {
  const document = `${"Phrase très longue. ".repeat(20)}\n\nBonjour,`;

  expect(splitSubjectAndBody(document)).toEqual({ subject: "", body: document });
});

test("laisse le corps intact quand le document est vide", () => {
  expect(splitSubjectAndBody("   \n\n  ")).toEqual({ subject: "", body: "   \n\n  " });
});
