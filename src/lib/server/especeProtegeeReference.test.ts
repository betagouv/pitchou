import { expect, test } from "vitest";

import { aggregateEspeceProtegeeReference, type TaxrefNameRow } from "./especeProtegeeReference.ts";

const NBSP = " ";

/** A TAXREF row with sensible defaults (an accepted bird taxon). */
function taxref(row: Partial<TaxrefNameRow> & { cd_ref: string; cd_nom: string }): TaxrefNameRow {
  return { lb_nom: "", nom_vern: "", regne: "Animalia", classe: "Aves", ...row };
}

/** Convenience: aggregate a single protected CD_REF carrying the given statuts. */
function aggregateOne(rows: TaxrefNameRow[], statuts: string[]) {
  const cd_ref = rows[0].cd_ref;
  const [result] = aggregateEspeceProtegeeReference(rows, new Map([[cd_ref, new Set(statuts)]]));
  return result;
}

test("accepted name comes first, synonyms follow in import order, statuts ordered PN/PR/PD/POM", () => {
  const espece = aggregateOne(
    [
      taxref({ cd_ref: "1", cd_nom: "1", lb_nom: "Accepted", nom_vern: "Vern A, Vern B" }),
      taxref({ cd_ref: "1", cd_nom: "1-1", lb_nom: "Synonym 1" }),
      taxref({ cd_ref: "1", cd_nom: "1-2", lb_nom: "Synonym 2" }),
    ],
    ["POM", "PD", "PN"],
  );

  expect(espece.noms_scientifiques).toEqual(["Accepted", "Synonym 1", "Synonym 2"]);
  expect(espece.noms_vernaculaires).toEqual(["Vern A", "Vern B"]);
  expect(espece.cd_type_statuts).toEqual(["PN", "PD", "POM"]);
  expect(espece.classification).toBe("oiseau");
});

test("the accepted taxon is first even when a synonym was imported earlier", () => {
  const espece = aggregateOne(
    [
      taxref({ cd_ref: "2", cd_nom: "2-1", lb_nom: "Synonym first" }),
      taxref({ cd_ref: "2", cd_nom: "2", lb_nom: "Accepted later" }),
    ],
    ["PN"],
  );

  expect(espece.noms_scientifiques).toEqual(["Accepted later", "Synonym first"]);
});

test("names are deduped; end spaces incl. U+00A0 are trimmed; empty parts dropped; internal U+00A0 kept", () => {
  const espece = aggregateOne(
    [
      taxref({
        cd_ref: "3",
        cd_nom: "3",
        lb_nom: "Dup",
        nom_vern: `${NBSP}Trimmed${NBSP},, Keep ,Foo${NBSP}Bar`,
      }),
      taxref({ cd_ref: "3", cd_nom: "3-1", lb_nom: "Dup", nom_vern: "Keep" }),
    ],
    ["PN"],
  );

  expect(espece.noms_scientifiques).toEqual(["Dup"]);
  expect(espece.noms_vernaculaires).toEqual(["Trimmed", "Keep", `Foo${NBSP}Bar`]);
});

test("classification: Plantae → flore, Animalia/Aves → oiseau, other Animalia → faune non-oiseau", () => {
  const flore = aggregateOne(
    [taxref({ cd_ref: "10", cd_nom: "10", lb_nom: "Plant", regne: "Plantae", classe: "" })],
    ["PN"],
  );
  const faune = aggregateOne(
    [
      taxref({
        cd_ref: "11",
        cd_nom: "11",
        lb_nom: "Mammal",
        regne: "Animalia",
        classe: "Mammalia",
      }),
    ],
    ["PN"],
  );

  expect(flore.classification).toBe("flore");
  expect(faune.classification).toBe("faune non-oiseau");
});

test("drops species without a kept classification or without any name", () => {
  const noClassification = aggregateEspeceProtegeeReference(
    [taxref({ cd_ref: "20", cd_nom: "20", lb_nom: "X", regne: "Bacteria", classe: "" })],
    new Map([["20", new Set(["PN"])]]),
  );
  const noName = aggregateEspeceProtegeeReference(
    [
      taxref({
        cd_ref: "21",
        cd_nom: "21",
        lb_nom: "",
        nom_vern: "",
        regne: "Plantae",
        classe: "",
      }),
    ],
    new Map([["21", new Set(["PN"])]]),
  );

  expect(noClassification).toEqual([]);
  expect(noName).toEqual([]);
});
