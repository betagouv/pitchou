import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sourceReader, hash } from "./source.mjs";

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "onagre-evidence-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "project.json");
  const demande = {
    identity: { key: "onagre-national:demandes:1" },
    source: {
      rows: {
        especes: [{ especesid: "s", nomscientifique: "Bufo bufo", notaxref: "259" }],
        methode: [{ methodeid: "m", libmethode: "Capture" }],
        activites: [{ activitesid: "a", libactivites: "Capture de spécimens" }],
        descriptionsespeces: [
          {
            descriptionsespecesid: "d",
            especesid: "s",
            methodeid: "m",
            cmtactivitesespeces: "épuisette",
          },
        ],
        descriptionsespeces_activites: [{ descriptionsespecesid: "d", activitesid: "a" }],
      },
    },
    proposal: {
      speciesImpacts: [
        {
          sourceKey: "onagre-national:descriptionsespeces:d:activites:a",
          values: { classification: "faune non-oiseau", impact_type: null },
        },
      ],
    },
    issues: [{ code: "species-impact-unresolved", descriptionId: "d", activityId: "a" }],
  };
  fs.writeFileSync(file, JSON.stringify({ demandes: [demande] }));
  const manifest = {
    entries: [{ path: file, projectId: "1", sha256: hash(fs.readFileSync(file)) }],
    skipped: [],
  };
  const references = {
    impact_type: [
      {
        classification: "faune non-oiseau",
        activites_onagre: ["Capture de spécimens"],
        identifiant_pitchou: "P-20",
        libelle_pitchou: "Captivité",
      },
      {
        classification: "faune non-oiseau",
        activites_onagre: ["Capture de spécimens"],
        identifiant_pitchou: "P-30",
        libelle_pitchou: "Relâcher",
      },
      {
        classification: "oiseau",
        activites_onagre: ["Capture de spécimens"],
        identifiant_pitchou: "OTHER",
        libelle_pitchou: "Oiseau",
      },
    ],
  };
  const occurrence = {
    projectPath: file,
    projectId: "1",
    demandeKey: demande.identity.key,
    descriptionId: "d",
    species: "Bufo bufo",
    sourceTaxref: "259",
    activityText: "épuisette",
    descriptionText: null,
    precisionText: null,
  };
  const group = {
    category: "unresolved_activity",
    context: {
      activities: ["Capture de spécimens"],
      method: "Capture",
      classifications: ["faune non-oiseau"],
      impactTypes: [null],
      unresolvedActivityId: "a",
    },
  };
  return { file, manifest, references, occurrence, group };
}

test("candidates use the description's classification and retain exact free text", (t) => {
  const f = fixture(t);
  const { facts } = sourceReader(f.manifest, f.references)(f.occurrence, f.group);
  assert.deepEqual(
    facts.activities[0].candidates.map((c) => c.code),
    ["P-20", "P-30"],
  );
  assert.equal(facts.activityText, "épuisette");
});
test("rejects borrowing a description from another demande", (t) => {
  const f = fixture(t);
  assert.throws(
    () => sourceReader(f.manifest, f.references)({ ...f.occurrence, demandeKey: "other" }, f.group),
    /another demande/u,
  );
});
test("rejects changed prepared bytes even when identifiers still match", (t) => {
  const f = fixture(t);
  fs.appendFileSync(f.file, "\n");
  assert.throws(
    () => sourceReader(f.manifest, f.references)(f.occurrence, f.group),
    /Prepared source has changed/u,
  );
});
test("rejects a group's borrowed activity or text", (t) => {
  const f = fixture(t),
    reader = sourceReader(f.manifest, f.references);
  assert.throws(
    () => reader({ ...f.occurrence, activityText: "filet" }, f.group),
    /Occurrence\/source mismatch/u,
  );
  assert.throws(() =>
    reader(f.occurrence, {
      ...f.group,
      context: { ...f.group.context, unresolvedActivityId: "other" },
    }),
  );
});
