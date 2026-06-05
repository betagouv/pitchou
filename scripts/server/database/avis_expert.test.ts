import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./fichier.ts", async () => {
  const actual = await vi.importActual<typeof import("./fichier.ts")>("./fichier.ts");
  return {
    ...actual,
    stockerNouveauFichier: vi.fn(),
    supprimerFichiersSansAutresRéférences: vi.fn(),
  };
});

import {
  ajouterOuModifierAvisExpertAvecFichiers,
  modifierAvisExpert,
  supprimerAvisExpert,
} from "./avis_expert.ts";
import { stockerNouveauFichier, supprimerFichiersSansAutresRéférences } from "./fichier.ts";
import { fakeDatabase } from "./fakeDatabase.js";
import type { AvisExpertId } from "../../types/database/public/AvisExpert.ts";
import type { DossierId } from "../../types/database/public/Dossier.ts";
import type { FichierId } from "../../types/database/public/Fichier.ts";

const aeId = "ae-1" as AvisExpertId;
const dossierId = 1 as DossierId;
const fSaisine = "f-saisine" as FichierId;
const fAvis = "f-avis" as FichierId;
const oldSaisine = "old-saisine" as FichierId;
const oldAvis = "old-avis" as FichierId;
const newSaisine = "new-saisine" as FichierId;
const newAvis = "new-avis" as FichierId;

const stocker = vi.mocked(stockerNouveauFichier);
const supprimer = vi.mocked(supprimerFichiersSansAutresRéférences);

beforeEach(() => {
  stocker.mockReset();
  supprimer.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("supprimerAvisExpert", () => {
  it("wraps a single id into an array for whereIn", async () => {
    const db = fakeDatabase().selectResolves([]).build();
    await supprimerAvisExpert(aeId, db.knex);
    expect(db.whereIn).toHaveBeenCalledWith("id", [aeId]);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("passes an array of ids through unchanged", async () => {
    const db = fakeDatabase().selectResolves([]).build();
    const ids = ["a", "b", "c"] as unknown as AvisExpertId[];
    await supprimerAvisExpert(ids, db.knex);
    expect(db.whereIn).toHaveBeenCalledWith("id", ids);
  });

  it("skips fichier cleanup when avis_expert had no attached fichiers", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [{ saisine_fichier: null, avis_fichier: null }])
      .build();
    await supprimerAvisExpert(aeId, db.knex);
    const tables = new Set(db.table.mock.calls.map(([name]) => name));
    expect(tables).toEqual(new Set(["avis_expert"]));
    expect(supprimer).not.toHaveBeenCalled();
  });

  it("cleans up the saisine + avis fichiers via supprimerFichiersSansAutresRéférences", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [{ saisine_fichier: fSaisine, avis_fichier: fAvis }])
      .build();
    await supprimerAvisExpert(aeId, db.knex);
    expect(supprimer).toHaveBeenCalledWith([fSaisine, fAvis], db.knex);
  });
});

describe("ajouterOuModifierAvisExpertAvecFichiers", () => {
  const baseAvis = {
    dossier: dossierId,
    expert: "expert-x",
    avis: "ok",
    date_saisine: new Date(0),
    date_avis: new Date(0),
  };

  it("inserts a new avis_expert with both fichier ids when both files are provided", async () => {
    stocker.mockResolvedValueOnce({ id: fSaisine });
    stocker.mockResolvedValueOnce({ id: fAvis });
    const db = fakeDatabase()
      .insertResolves([{ id: aeId }])
      .build();

    const fichierSaisine = {
      nom: "saisine.pdf",
      contenu: Buffer.from("S"),
      media_type: "application/pdf",
    };
    const fichierAvis = {
      nom: "avis.pdf",
      contenu: Buffer.from("A"),
      media_type: "application/pdf",
    };

    await ajouterOuModifierAvisExpertAvecFichiers(baseAvis, fichierSaisine, fichierAvis, db.knex);

    expect(stocker).toHaveBeenCalledTimes(2);
    expect(stocker).toHaveBeenCalledWith(fichierSaisine, db.knex);
    expect(stocker).toHaveBeenCalledWith(fichierAvis, db.knex);
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        dossier: dossierId,
        saisine_fichier: fSaisine,
        avis_fichier: fAvis,
      }),
    );
  });

  it("uploads only the saisine when only the saisine fichier is provided", async () => {
    stocker.mockResolvedValueOnce({ id: fSaisine });
    const db = fakeDatabase()
      .insertResolves([{ id: aeId }])
      .build();

    const fichierSaisine = {
      nom: "s.pdf",
      contenu: Buffer.from("S"),
      media_type: "application/pdf",
    };
    await ajouterOuModifierAvisExpertAvecFichiers(baseAvis, fichierSaisine, undefined, db.knex);

    expect(stocker).toHaveBeenCalledTimes(1);
    expect(stocker).toHaveBeenCalledWith(fichierSaisine, db.knex);
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({ saisine_fichier: fSaisine, avis_fichier: undefined }),
    );
  });

  it("routes to modifierAvisExpert when avis.id is set, populating the fichier columns", async () => {
    stocker.mockResolvedValueOnce({ id: fAvis });
    // No previous saisine/avis on the existing row -> no cleanup expected.
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [{ saisine_fichier: null, avis_fichier: null }])
      .build();

    await ajouterOuModifierAvisExpertAvecFichiers(
      { ...baseAvis, id: aeId },
      undefined,
      { nom: "a.pdf", contenu: Buffer.from("A"), media_type: "application/pdf" },
      db.knex,
    );

    expect(db.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: aeId,
        saisine_fichier: undefined,
        avis_fichier: fAvis,
      }),
    );
  });

  it("propagates errors from stockerNouveauFichier and never inserts the avis_expert", async () => {
    stocker.mockRejectedValue(new Error("S3 down"));
    const db = fakeDatabase().build();

    await expect(
      ajouterOuModifierAvisExpertAvecFichiers(
        baseAvis,
        { nom: "s.pdf", contenu: Buffer.from(""), media_type: "application/pdf" },
        undefined,
        db.knex,
      ),
    ).rejects.toThrow();

    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("modifierAvisExpert", () => {
  it("cleans up the previous saisine fichier when it is replaced", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [{ saisine_fichier: oldSaisine, avis_fichier: null }])
      .build();

    await modifierAvisExpert({ id: aeId, saisine_fichier: newSaisine }, db.knex);

    expect(supprimer).toHaveBeenCalledWith([oldSaisine], db.knex);
  });

  it("cleans up both previous fichiers when both are replaced", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [
        { saisine_fichier: oldSaisine, avis_fichier: oldAvis },
      ])
      .build();

    await modifierAvisExpert(
      { id: aeId, saisine_fichier: newSaisine, avis_fichier: newAvis },
      db.knex,
    );

    expect(supprimer).toHaveBeenCalledWith([oldSaisine, oldAvis], db.knex);
  });

  it("does not call supprimer when the fichier columns are not touched in the update", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [{ saisine_fichier: fSaisine, avis_fichier: fAvis }])
      .build();

    await modifierAvisExpert({ id: aeId, avis: "updated" }, db.knex);

    expect(supprimer).not.toHaveBeenCalled();
  });
});
