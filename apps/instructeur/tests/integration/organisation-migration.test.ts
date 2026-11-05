import { expect, test } from "vitest";
import {
  up,
  down,
} from "../../../../libs/database/migrations/20261104160000_organisations-without-siret.ts";
import { createDossier } from "../factories/dossier.ts";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";

const organisation = {
  name: "Commune de Tours",
  address: null,
  siren: null,
  verification_status: "source_declared",
  source: "onagre",
  source_reference: "acteur-42",
  verification_evidence: null,
};

test("migration preserves existing porteurs and rollback refuses to discard organisations", async () => {
  const fixture = await disposableAccessDatabase("20261104160000");
  const { db } = fixture;
  try {
    const [{ id: personne }] = await db("personne_physique")
      .insert({ last_name: "Martin" })
      .returning("id");
    const [{ id: porteur }] = await db("porteur_de_projet")
      .insert({ personne_physique: personne })
      .returning("id");
    const dossier = await createDossier(db, { porteur_de_projet: porteur });
    await db.transaction(up);
    expect(await db("dossier").where({ id: dossier.id }).first("porteur_de_projet")).toEqual({
      porteur_de_projet: porteur,
    });
    const [{ id }] = await db("organisation").insert(organisation).returning("id");
    await db("porteur_de_projet").insert({ organisation: id });
    await expect(db.transaction(down)).rejects.toThrow("Cannot roll back");
    await db("porteur_de_projet").where({ organisation: id }).delete();
    await db.transaction(down);
    expect(await db.schema.hasTable("organisation")).toBe(false);
    expect(await db("porteur_de_projet").where({ id: porteur }).first("personne_physique")).toEqual(
      { personne_physique: personne },
    );
    await expect(db("porteur_de_projet").insert({})).rejects.toThrow(/porteur_de_projet_check/u);
    await db.transaction(up);
  } finally {
    await fixture.close();
  }
}, 60_000);

test("database rejects unverified SIRENs, missing provenance and invalid verification evidence", async () => {
  const fixture = await disposableAccessDatabase();
  const { db } = fixture;
  try {
    const invalid = [
      { name: "" },
      { name: "   " },
      { name: " \t\n" },
      { source: " " },
      { source_reference: " " },
      { source: "\t\n" },
      { source_reference: "\t\n" },
      { siren: "123456789" },
      { verification_evidence: "Imported" },
      { verification_status: "unknown" },
      { verification_status: "verified" },
      { verification_status: "verified", verification_evidence: " " },
      { verification_status: "verified", verification_evidence: "\t\n" },
      { verification_status: "verified", verification_evidence: "Registry", siren: "abcdefghi" },
      { verification_status: "verified", verification_evidence: "Registry", siren: "12345678" },
    ];
    for (const changes of invalid) {
      await expect(db("organisation").insert({ ...organisation, ...changes })).rejects.toThrow(
        /organisation_\w+_check/u,
      );
    }
    await expect(db("organisation").insert({ ...organisation, source: null })).rejects.toThrow(
      /not-null constraint/u,
    );
    await db("organisation").insert([
      organisation,
      { ...organisation, verification_status: "verified", verification_evidence: "Registry" },
      {
        ...organisation,
        verification_status: "verified",
        verification_evidence: "Registry",
        siren: "123456789",
      },
    ]);
    expect(await db("organisation")).toHaveLength(3);
  } finally {
    await fixture.close();
  }
}, 60_000);

test("a porteur requires exactly one valid reference among its three variants", async () => {
  const fixture = await disposableAccessDatabase();
  const { db } = fixture;
  try {
    const [{ id }] = await db("organisation").insert(organisation).returning("id");
    const [{ id: personne }] = await db("personne_physique")
      .insert({ last_name: "Martin" })
      .returning("id");
    const siret = "12345678900001";
    await db("entreprise").insert({ siret });
    for (const references of [
      {},
      { personne_physique: personne, organisation: id },
      { personne_morale: siret, organisation: id },
      { personne_physique: personne, personne_morale: siret, organisation: id },
    ]) {
      await expect(db("porteur_de_projet").insert(references)).rejects.toThrow(
        /porteur_de_projet_check/u,
      );
    }
    await expect(db("porteur_de_projet").insert({ organisation: id + 1 })).rejects.toThrow(
      /foreign key constraint/u,
    );
    await db("porteur_de_projet").insert({ organisation: id });
    await expect(db("organisation").where({ id }).delete()).rejects.toThrow(
      /foreign key constraint/u,
    );
  } finally {
    await fixture.close();
  }
}, 60_000);
