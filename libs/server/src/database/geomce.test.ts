import { describe, it, expect } from "vitest";
import { genererMessagesGeoMCE } from "./geomce.ts";
import type { DossierPourGeoMCE } from "@pitchou/types/geomce.ts";

// Only the fields genererMessagesGeoMCE reads, with plain types (the branded
// id/siret are simplified here since the result is cast to DossierPourGeoMCE).
type DossierOverrides = {
  id?: number;
  nom?: string | null;
  description?: string | null;
  communes?: { code: string }[];
  demandeur_personne_morale?: string | null;
  date_signature?: Date | null;
  instructeurs?: DossierPourGeoMCE["instructeurs"];
  specimens_faunes?: DossierPourGeoMCE["specimens_faunes"];
  specimens_flores?: DossierPourGeoMCE["specimens_flores"];
};

// Builds a DossierPourGeoMCE with only the fields genererMessagesGeoMCE reads.
function makeDossier(overrides: DossierOverrides = {}): DossierPourGeoMCE {
  return {
    id: 42,
    nom: "Parc éolien du Test",
    description: "Un projet de test",
    communes: [{ code: "01001" }, { code: "75056" }],
    demandeur_personne_morale: "12345678901234",
    date_signature: new Date("2026-03-15T10:30:00Z"),
    instructeurs: [{ email: "instructeur@example.org", date_from: "2026-01-01" }],
    specimens_faunes: [{ nom_scientifique: "Morus bassanus" }],
    specimens_flores: [{ nom_scientifique: "Narcissus tazetta" }],
    ...overrides,
  } as unknown as DossierPourGeoMCE;
}

describe("genererMessagesGeoMCE", () => {
  it("dérive ref, num_dossier et references depuis l'id", () => {
    const message = genererMessagesGeoMCE(makeDossier({ id: 7 }));

    expect(message.projet.ref).toBe("PITCHOU-7");
    expect(message.procedure.num_dossier).toBe("PITCHOU-7");
    expect(message.procedure.references).toEqual(["PITCHOU-7"]);
  });

  it("garde le nom du dossier quand il est renseigné", () => {
    const message = genererMessagesGeoMCE(makeDossier({ nom: "Mon projet" }));

    expect(message.projet.nom).toBe("Mon projet");
  });

  it("retombe sur un nom par défaut quand le dossier n'a pas de nom", () => {
    const message = genererMessagesGeoMCE(makeDossier({ id: 7, nom: null }));

    expect(message.projet.nom).toBe("Dossier Pitchou #7");
  });

  it("retombe sur une description vide quand le dossier n'en a pas", () => {
    const message = genererMessagesGeoMCE(makeDossier({ description: null }));

    expect(message.projet.description).toBe("");
    expect(message.procedure.description).toBe("");
  });

  it("transforme les communes en localisations", () => {
    const message = genererMessagesGeoMCE(makeDossier());

    expect(message.projet.localisations).toEqual(["01001", "75056"]);
  });

  it("construit la maîtrise d'ouvrage depuis le SIRET du demandeur", () => {
    const message = genererMessagesGeoMCE(
      makeDossier({ demandeur_personne_morale: "98765432109876" }),
    );

    expect(message.projet.maitrise_ouvrage).toEqual([{ siret: "98765432109876" }]);
  });

  it("laisse la maîtrise d'ouvrage à null sans demandeur personne morale", () => {
    const message = genererMessagesGeoMCE(makeDossier({ demandeur_personne_morale: null }));

    expect(message.projet.maitrise_ouvrage).toBeNull();
  });

  it("formate la date de décision en YYYY-MM-DD", () => {
    const message = genererMessagesGeoMCE(
      makeDossier({ date_signature: new Date("2026-03-15T10:30:00Z") }),
    );

    expect(message.procedure.date_decision).toBe("2026-03-15");
  });

  it("laisse la date de décision à null sans date de signature", () => {
    const message = genererMessagesGeoMCE(makeDossier({ date_signature: null }));

    expect(message.procedure.date_decision).toBeNull();
  });

  it("recopie les spécimens faune et flore dans la procédure", () => {
    const message = genererMessagesGeoMCE(makeDossier());

    expect(message.procedure.specimens_faunes).toEqual([{ nom_scientifique: "Morus bassanus" }]);
    expect(message.procedure.specimens_flores).toEqual([{ nom_scientifique: "Narcissus tazetta" }]);
  });

  it("recopie les instructeurs dans la procédure", () => {
    const instructeurs = [{ email: "a@example.org", date_from: "2026-02-02" }];
    const message = genererMessagesGeoMCE(makeDossier({ instructeurs }));

    expect(message.procedure.instructeurs).toEqual(instructeurs);
  });

  it("pose les valeurs fixes attendues par GeoMCE", () => {
    const message = genererMessagesGeoMCE(makeDossier());

    expect(message.projet.avancement).toBe("Autorisé");
    expect(message.projet.typologies).toBeNull();
    expect(message.projet.emprises).toBeNull();
    expect(message.procedure.type).toBe("En Attente de GeoMCE Dérogation Espèces Protégées");
    expect(message.procedure.autorite_decisionnaire).toBeNull();
    expect(message.procedure.emprises).toBeNull();
    expect(message.mesures).toEqual([]);
  });
});
