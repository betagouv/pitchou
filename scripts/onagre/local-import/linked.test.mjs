import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { connect, initialize } from "./connection.mjs";
import { groupPreparedDemandes } from "./projects.mjs";
import { reconciliationHash, reconciliationEvidence } from "./linked.mjs";
import { linkExistingDemandes } from "./link-existing.mjs";
import { importSamples } from "./run.mjs";
import { recordExcludedCandidates } from "./exclusions.mjs";
import { assertNoUnreviewedDuplicates } from "./reconciliation.mjs";
import { reviewedFileMetadata } from "./link-existing/files.mjs";

function project(ids = ["990001"], projectId = "990000") {
  return groupPreparedDemandes(
    ids.map((id) => ({
      formatVersion: 1,
      identity: {
        sourceInstance: "onagre-national",
        sourceTable: "demandes",
        sourceId: id,
        projetId: projectId,
        key: `onagre-national:demandes:${id}`,
      },
      proposal: {
        dossier: {
          source: "onagre",
          name: "Synthetic source title",
          onagre_demande_identifier: `2099-link-check-${id}`,
          depot_date: null,
        },
        records: [],
      },
      source: {
        rows: {
          projet: [
            {
              projetid: projectId,
              nomprojet: "Synthetic source title",
              codeprojet: "2099-link-check-project",
            },
          ],
        },
        relatedDemandes: ids.map((id) => ({ id, code: `2099-link-check-${id}` })),
      },
    })),
  )[0];
}
test(
  "explicit cross-project references preserve one DN record and every source identity",
  { skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1" },
  async () => {
    const c = await connect(process.env);
    try {
      await c.begin();
      await initialize(c);
      const email = `shared-${randomUUID()}@example.invalid`;
      const [user] = await c.trx("auth_user").insert({ email, active: true }).returning("id");
      await c.trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
      const projects = [project(["990001"]), project(["990002"], "990003")];
      const [target] = await c
        .trx("dossier")
        .insert({
          source: "demarche_numerique",
          name: "Combined DN history",
          onagre_demande_identifier: projects
            .map((p) => p.demandes[0].proposal.dossier.onagre_demande_identifier)
            .join(" ; "),
        })
        .returning("id");
      await c
        .trx("dossier_user_access")
        .insert({ dossier: target.id, user_id: user.id, access_level: "instruct" });
      const current = async () =>
        (await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id])).rows[0]
          .row;
      const original = await current();
      const entries = projects.map((p) => ({
        project: p,
        decision: {
          action: "link_existing_demande",
          demandeKey: p.demandes[0].identity.key,
          dossierId: target.id,
          projectHash: reconciliationHash(p),
          targetHash: reconciliationHash(original),
          reason:
            "Both complete source references were independently confirmed against the existing combined DN record.",
        },
      }));
      await assert.rejects(linkExistingDemandes(c, entries, email), /target cannot represent two/u);
      for (const { decision } of entries)
        Object.assign(decision, {
          sharedTargetProjectKeys: projects.map((p) => p.identity.key),
          sharedTargetReview:
            "The existing DN record explicitly contains both source references. Preserve its single history and retain both original source project identities without creating another DN record.",
        });
      await assert.rejects(
        linkExistingDemandes(c, entries.slice(0, 1), email),
        /complete shared-target review/u,
      );
      const result = await linkExistingDemandes(c, entries, email);
      assert.equal(result.length, 2);
      assert.equal(new Set(result.map((r) => r.projectUuid)).size, 1);
      assert(result.every((r) => r.heldDemandeKeys.length === 0));
      assert(
        (await linkExistingDemandes(c, [...entries].reverse(), email)).every(
          (r) => r.status === "unchanged",
        ),
      );
      for (const p of projects) {
        const replay = await importSamples(c, [p], email);
        assert.equal(replay.length, 1);
        assert.equal(replay[0].dossierId, target.id);
        assert.deepEqual(replay[0].outcomes, []);
      }
      const ledger = (
        await c.query(
          "SELECT project_key, source_key FROM onagre_local_import.reconciled_demande WHERE dossier_id=$1",
          [target.id],
        )
      ).rows;
      assert.deepEqual(
        ledger.map((r) => r.project_key).sort(),
        projects.map((p) => p.identity.key).sort(),
      );
      assert.equal(
        (await c.query("SELECT * FROM dossier_demande WHERE dossier=$1", [target.id])).rows.length,
        1,
      );
      assert.deepEqual(await current(), original);
      await c.finish(false);
    } finally {
      await c.end();
    }
  },
);
test(
  "a documented main DN record preserves secondary entries and rejects stale or new candidates",
  { skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1" },
  async () => {
    const c = await connect(process.env);
    try {
      await c.begin();
      await initialize(c);
      const email = "related-" + randomUUID() + "@example.invalid";
      const [user] = await c.trx("auth_user").insert({ email, active: true }).returning("id");
      await c.trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
      const p = project();
      const rows = await c
        .trx("dossier")
        .insert(
          ["Main history", "Supplement only"].map((name) => ({
            name,
            source: "demarche_numerique",
            onagre_demande_identifier: p.demandes[0].proposal.dossier.onagre_demande_identifier,
          })),
        )
        .returning("id");
      await c
        .trx("dossier_user_access")
        .insert(rows.map((r) => ({ dossier: r.id, user_id: user.id, access_level: "instruct" })));
      const current = async (id) =>
        (await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [id])).rows[0].row;
      const originals = await Promise.all(rows.map((r) => current(r.id)));
      const decision = {
        action: "link_existing_demande",
        demandeKey: p.demandes[0].identity.key,
        dossierId: rows[0].id,
        projectHash: reconciliationHash(p),
        targetHash: reconciliationHash(originals[0]),
        reason:
          "The explicitly documented main DN entry retains its complete history; no secondary record is deleted.",
      };
      await assert.rejects(
        linkExistingDemandes(c, [{ project: p, decision }], email),
        /Other candidates require review/u,
      );
      decision.relatedExisting = [
        {
          dossierId: rows[1].id,
          relationship: "supplement",
          targetHash: reconciliationHash(originals[1]),
          targetEvidenceHash: reconciliationHash(await reconciliationEvidence(c, rows[1].id)),
          reason:
            "The secondary entry explicitly documents supplementary documents for the main request; retain it intact without an imported identity or membership.",
        },
      ];
      assert.equal(
        (await linkExistingDemandes(c, [{ project: p, decision }], email))[0].status,
        "linked",
      );
      assert.equal(
        (await linkExistingDemandes(c, [{ project: p, decision }], email))[0].status,
        "unchanged",
      );
      const files = [],
        replay = await importSamples(c, [p], email, { files });
      assert.equal(replay.length, 1);
      assert.equal(replay[0].dossierId, rows[0].id);
      assert.deepEqual(replay[0].outcomes, []);
      assert.deepEqual(files, []);
      assert.equal(
        (
          await c.query("SELECT count(*)::integer AS n FROM dossier_demande WHERE dossier=$1", [
            rows[1].id,
          ])
        ).rows[0].n,
        0,
      );
      await c.trx("commentaire").insert({
        dossier: rows[1].id,
        content: "A changed secondary history needs another review",
      });
      await assert.rejects(importSamples(c, [p], email), /Related DN record changed/u);
      await c.trx("commentaire").where({ dossier: rows[1].id }).delete();
      await c.trx("dossier").insert({
        source: "demarche_numerique",
        onagre_demande_identifier: p.demandes[0].proposal.dossier.onagre_demande_identifier,
      });
      await assert.rejects(importSamples(c, [p], email), /require reconciliation/u);
      assert.deepEqual(await Promise.all(rows.map((r) => current(r.id))), originals);
      await c.finish(false);
    } finally {
      await c.end();
    }
  },
);
test(
  "a negative review excludes only its exact pair and rejects changed evidence or new candidates",
  { skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1" },
  async () => {
    const c = await connect(process.env);
    try {
      await c.begin();
      await initialize(c);
      const email = `reconciliation-${randomUUID()}@example.invalid`;
      const [user] = await c.trx("auth_user").insert({ email, active: true }).returning("id");
      await c.trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
      const p = project();
      p.demandes[0].proposal.dossier.departments = ["17"];
      const [target] = await c
        .trx("dossier")
        .insert({
          name: "Synthetic source title",
          source: "demarche_numerique",
          departments: JSON.stringify(["17"]),
        })
        .returning("id");
      await c
        .trx("dossier_user_access")
        .insert({ dossier: target.id, user_id: user.id, access_level: "instruct" });
      const original = (
        await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id])
      ).rows[0].row;
      const decision = {
        action: "exclude_candidate",
        dossierId: target.id,
        projectHash: reconciliationHash(p),
        targetHash: reconciliationHash(original),
        targetEvidenceHash: reconciliationHash(await reconciliationEvidence(c, target.id)),
        reason:
          "Explicit synthetic review: the similarly named DN entry concerns a different site and application period; it must never receive this source reference.",
      };
      await assert.rejects(assertNoUnreviewedDuplicates(c, [p]), /require reconciliation/u);
      assert.equal(
        (await recordExcludedCandidates(c, [{ project: p, decision }], email))[0].status,
        "excluded",
      );
      assert.equal(
        (await recordExcludedCandidates(c, [{ project: p, decision }], email))[0].status,
        "unchanged",
      );
      await assertNoUnreviewedDuplicates(c, [p]);
      const changed = structuredClone(p);
      changed.proposal.name += " changed";
      await assert.rejects(assertNoUnreviewedDuplicates(c, [changed]), /review is stale/u);
      await c
        .trx("commentaire")
        .insert({ dossier: target.id, content: "New evidence requiring review" });
      await assert.rejects(assertNoUnreviewedDuplicates(c, [p]), /review is stale/u);
      await c.trx("commentaire").where({ dossier: target.id }).delete();
      await c.trx("dossier").insert({
        name: "Synthetic source title",
        source: "demarche_numerique",
        departments: JSON.stringify(["17"]),
      });
      await assert.rejects(assertNoUnreviewedDuplicates(c, [p]), /require reconciliation/u);
      assert.deepEqual(
        (await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id])).rows[0]
          .row,
        original,
      );
      await c.finish(false);
    } finally {
      await c.end();
    }
  },
);
test(
  "reviewed single-scope fallbacks link and replay without changing the DN record",
  { skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1" },
  async () => {
    for (const profile of ["project_reference", "corroborated_scope"]) {
      const c = await connect(process.env);
      try {
        await c.begin();
        await initialize(c);
        const email = `reconciliation-${randomUUID()}@example.invalid`;
        const [user] = await c.trx("auth_user").insert({ email, active: true }).returning("id");
        await c
          .trx("auth_permission_bundle")
          .insert({ user_id: user.id, bundle: "administrateur" });
        const p = project();
        Object.assign(p.demandes[0].proposal.dossier, {
          departments: ["17"],
          ddep_depot_date: "2025-04-02",
        });
        const [target] = await c
          .trx("dossier")
          .insert({
            source: "demarche_numerique",
            name: "Synthetic source title",
            departments: JSON.stringify(["17"]),
            ddep_depot_date: "2025-04-02",
            onagre_demande_identifier:
              profile === "project_reference" ? "2099-link-check-project" : "",
            free_comment: "Preserve the full existing history",
          })
          .returning("id");
        await c
          .trx("dossier_user_access")
          .insert({ dossier: target.id, user_id: user.id, access_level: "instruct" });
        const current = async () =>
          (await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id]))
            .rows[0].row;
        const original = await current();
        const decision = {
          action: "link_existing_demande",
          demandeKey: p.demandes[0].identity.key,
          dossierId: target.id,
          projectHash: reconciliationHash(p),
          targetHash: reconciliationHash(original),
          targetEvidenceHash: reconciliationHash(await reconciliationEvidence(c, target.id)),
          matchProfile: profile,
          scopeReview:
            "Independent review of the sole source demande and the target's own operation, location and milestone confirms the same request; no sibling scope is inferred.",
          reason:
            "Reviewed single-scope provenance link with all existing DN business data preserved.",
        };
        const entries = [{ project: p, decision }];
        assert.equal((await linkExistingDemandes(c, entries, email)).length, 1);
        assert.equal((await linkExistingDemandes(c, entries, email))[0].status, "unchanged");
        const replay = await importSamples(c, [p], email);
        assert.equal(replay.length, 1);
        assert.equal(replay[0].dossierId, target.id);
        assert.equal(replay[0].outcomes.length, 0);
        assert.deepEqual(await current(), original);
        await c.finish(false);
      } finally {
        await c.end();
      }
    }
  },
);
test(
  "several confirmed Onagre references preserve one combined DN record on replay",
  { skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1" },
  async () => {
    const c = await connect(process.env);
    try {
      await c.begin();
      await initialize(c);
      const email = `reconciliation-${randomUUID()}@example.invalid`;
      const [user] = await c.trx("auth_user").insert({ email, active: true }).returning("id");
      await c.trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
      const p = project(["990001", "990002", "990003"]);
      const [target] = await c
        .trx("dossier")
        .insert({
          name: "One combined DN record",
          source: "demarche_numerique",
          onagre_demande_identifier: p.demandes
            .map((d) => d.proposal.dossier.onagre_demande_identifier)
            .join(" ; "),
          free_comment: "All history stays on this record",
        })
        .returning("*");
      await c
        .trx("dossier_user_access")
        .insert({ dossier: target.id, user_id: user.id, access_level: "instruct" });
      const current = async () =>
        (await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id])).rows[0]
          .row;
      const original = await current();
      const entries = p.demandes.map((d) => ({
        project: p,
        decision: {
          action: "link_existing_demande",
          dossierId: target.id,
          demandeKey: d.identity.key,
          projectHash: reconciliationHash(p),
          targetHash: reconciliationHash(original),
          reason:
            "Explicit review confirms all three complete references belong to this single existing combined DN record.",
        },
      }));
      await assert.rejects(
        linkExistingDemandes(c, entries.slice(0, 2), email),
        /Other candidates require review/u,
      );
      const results = await linkExistingDemandes(c, entries, email);
      assert.equal(results.length, 3);
      assert(results.every((r) => r.dossierId === target.id && r.heldDemandeKeys.length === 0));
      assert.equal(
        (await c.query("SELECT * FROM dossier_demande WHERE dossier=$1", [target.id])).rows.length,
        1,
      );
      assert.deepEqual(await current(), original);
      assert(
        (await linkExistingDemandes(c, [...entries].reverse(), email)).every(
          (r) => r.status === "unchanged",
        ),
      );
      const imported = await importSamples(c, [p], email);
      assert.equal(imported.length, 3);
      assert(imported.every((r) => r.dossierId === target.id && r.outcomes.length === 0));
      assert.deepEqual(await current(), original);
      await assert.rejects(
        linkExistingDemandes(c, entries.slice(0, 2), email),
        /cannot be replaced implicitly/u,
      );
      // Another source project needs a complete explicit shared-target review.
      const other = project(["990099"], "990098");
      const otherEntry = {
        project: other,
        decision: {
          ...entries[0].decision,
          demandeKey: other.demandes[0].identity.key,
          projectHash: reconciliationHash(other),
        },
      };
      await assert.rejects(
        linkExistingDemandes(c, [entries[0], otherEntry], email),
        /target cannot represent two reviewed projects/u,
      );
      await c.finish(false);
    } finally {
      await c.end();
    }
  },
);
test(
  "reviewed DN links preserve data and replay, reject drift and ambiguous scopes",
  {
    skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1",
  },
  async () => {
    const c = await connect(process.env);
    try {
      await c.begin();
      await initialize(c);
      const email = `reconciliation-${randomUUID()}@example.invalid`;
      const [user] = await c.trx("auth_user").insert({ email, active: true }).returning("id");
      await c.trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
      const [target] = await c
        .trx("dossier")
        .insert({
          name: "Existing DN title",
          source: "demarche_numerique",
          onagre_demande_identifier: "2099-link-check-990001",
          free_comment: "Keep my history",
        })
        .returning("id");
      await c
        .trx("dossier_user_access")
        .insert({ dossier: target.id, user_id: user.id, access_level: "instruct" });
      const current = () =>
        c
          .query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id])
          .then((r) => r.rows[0].row);
      const before = await current();
      const p = project();
      const decision = {
        action: "link_existing_demande",
        dossierId: target.id,
        demandeKey: p.demandes[0].identity.key,
        projectHash: reconciliationHash(p),
        targetHash: reconciliationHash(before),
        targetEvidenceHash: reconciliationHash(await reconciliationEvidence(c, target.id)),
        reason:
          "Explicit synthetic review: the exact demande reference and source evidence identify this existing record.",
      };
      await assert.rejects(
        linkExistingDemandes(
          c,
          [{ project: p, decision: { ...decision, targetHash: "outdated" } }],
          email,
        ),
        /Target changed/u,
      );
      const [newEvidence] = await c
        .trx("decision_administrative")
        .insert({
          dossier: target.id,
          type: "Arrêté dérogation",
          signature_date: "2025-01-01",
        })
        .returning("id");
      await assert.rejects(
        linkExistingDemandes(c, [{ project: p, decision }], email),
        /Target evidence changed/u,
      );
      await c.trx("decision_administrative").where({ id: newEvidence.id }).delete();
      assert.equal(
        (await linkExistingDemandes(c, [{ project: p, decision }], email))[0].status,
        "linked",
      );
      assert.deepEqual(await current(), before, "linking does not rewrite any DN field");
      assert.equal(
        (await linkExistingDemandes(c, [{ project: p, decision }], email))[0].status,
        "unchanged",
      );
      await c
        .trx("dossier")
        .where({ id: target.id })
        .update({ free_comment: "New instructor edit" });
      const replay = await importSamples(c, [p], email);
      assert.equal(replay[0].reconciliation, "linked_existing");
      assert.equal(replay[0].dossierId, target.id);
      assert.equal((await current()).free_comment, "New instructor edit");
      assert.equal((await current()).source, "demarche_numerique");
      const changed = structuredClone(p);
      changed.proposal.name = "Changed source";
      await assert.rejects(importSamples(c, [changed], email), /source changed/u);
      await c
        .trx("dossier")
        .where({ id: target.id })
        .update({ onagre_demande_identifier: "changed" });
      await assert.rejects(importSamples(c, [p], email), /identity or membership changed/u);
      await c
        .trx("dossier")
        .where({ id: target.id })
        .update({ onagre_demande_identifier: before.onagre_demande_identifier });
      const [conflict] = await c
        .trx("dossier")
        .insert({
          source: "demarche_numerique",
          onagre_demande_identifier: before.onagre_demande_identifier,
        })
        .returning("id");
      await assert.rejects(importSamples(c, [p], email), /require reconciliation/u);
      await c.trx("dossier").where({ id: conflict.id }).delete();
      // Simulate a separately reviewed full source snapshot that includes a held sibling.
      const multi = project(["990001", "990002"]);
      await c.query(
        "UPDATE onagre_local_import.reconciled_demande SET source_hash=$1 WHERE source_key=$2",
        [reconciliationHash(multi), decision.demandeKey],
      );
      await assert.rejects(
        importSamples(c, [multi], email),
        /Additional Onagre demandes require a scope review/u,
      );
      await c.finish(false);
    } finally {
      await c.end();
    }
  },
);

test(
  "distinct DN demandes share a reviewed project without merging records",
  { skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1" },
  async () => {
    const c = await connect(process.env);
    try {
      await c.begin();
      await initialize(c);
      const email = `reconciliation-${randomUUID()}@example.invalid`;
      const [user] = await c.trx("auth_user").insert({ email, active: true }).returning("id");
      await c.trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
      const p = project(["990001", "990002"]),
        entries = [],
        originals = [];
      for (const demande of p.demandes) {
        const [target] = await c
          .trx("dossier")
          .insert({
            name: `Keep DN title ${demande.identity.sourceId}`,
            source: "demarche_numerique",
            onagre_demande_identifier: demande.proposal.dossier.onagre_demande_identifier,
            free_comment: "Independent history",
          })
          .returning("id");
        await c
          .trx("dossier_user_access")
          .insert({ dossier: target.id, user_id: user.id, access_level: "instruct" });
        const row = (
          await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id])
        ).rows[0].row;
        originals.push(row);
        entries.push({
          project: p,
          decision: {
            action: "link_existing_demande",
            dossierId: target.id,
            demandeKey: demande.identity.key,
            projectHash: reconciliationHash(p),
            targetHash: reconciliationHash(row),
            reason:
              "Independent synthetic review confirms this exact demande and its own existing DN record.",
          },
        });
      }
      await assert.rejects(
        linkExistingDemandes(c, [entries[0]], email),
        /Other candidates require review/u,
      );
      const stale = structuredClone(entries);
      stale[1].decision.targetHash = "outdated";
      await assert.rejects(linkExistingDemandes(c, stale, email), /Target changed/u);
      assert.equal(
        (
          await c.query(
            "SELECT count(*)::integer AS n FROM onagre_local_import.reconciled_demande WHERE project_key=$1",
            [p.identity.key],
          )
        ).rows[0].n,
        0,
      );
      const repeatedTarget = structuredClone(entries);
      repeatedTarget[1].decision.dossierId = entries[0].decision.dossierId;
      await assert.rejects(
        linkExistingDemandes(c, repeatedTarget, email),
        /Other candidates require review/u,
      );
      const repeatedDemande = structuredClone(entries);
      repeatedDemande[1].decision.demandeKey = entries[0].decision.demandeKey;
      await assert.rejects(
        linkExistingDemandes(c, repeatedDemande, email),
        /demande cannot have two/u,
      );
      const result = await linkExistingDemandes(c, entries, email);
      assert.equal(result.length, 2);
      assert(result.every((r) => r.status === "linked" && r.heldDemandeKeys.length === 0));
      assert.equal(new Set(result.map((r) => r.projectUuid)).size, 1);
      assert.deepEqual(
        (await linkExistingDemandes(c, [...entries].reverse(), email)).map((r) => r.status),
        ["unchanged", "unchanged"],
      );
      await assert.rejects(
        linkExistingDemandes(c, [entries[0]], email),
        /cannot be replaced implicitly/u,
      );
      await c
        .trx("dossier")
        .where({ id: originals[0].id })
        .update({ free_comment: "Later instructor edit" });
      const files = [],
        imported = await importSamples(c, [p], email, { files });
      assert.deepEqual(
        imported.map((r) => r.dossierId),
        originals.map((r) => r.id),
      );
      assert(
        imported.every((r) => r.reconciliation === "linked_existing" && r.outcomes.length === 0),
      );
      assert.equal(files.length, 0);
      for (let i = 0; i < originals.length; i++) {
        const current = (
          await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [originals[i].id])
        ).rows[0].row;
        assert.deepEqual(current, {
          ...originals[i],
          ...(i === 0 ? { free_comment: "Later instructor edit" } : {}),
        });
      }
      const [competitor] = await c
        .trx("dossier")
        .insert({
          source: "demarche_numerique",
          onagre_demande_identifier: originals[0].onagre_demande_identifier,
        })
        .returning("id");
      await assert.rejects(importSamples(c, [p], email), /require reconciliation/u);
      await c.trx("dossier").where({ id: competitor.id }).delete();
      await c.finish(false);
    } finally {
      await c.end();
    }
  },
);

test(
  "a documented reference conflict preserves DN and requires an exact exclusion for the other source",
  { skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1" },
  async () => {
    const c = await connect(process.env);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "onagre-conflict-test-"));
    try {
      await c.begin();
      await initialize(c);
      const email = `conflict-${randomUUID()}@example.invalid`;
      const [user] = await c.trx("auth_user").insert({ email, active: true }).returning("id");
      await c.trx("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
      const p = project();
      const other = project(["990002"], "990003");
      const demande = p.demandes[0];
      demande.proposal.dossier.departments = ["40"];
      demande.proposal.records = [
        {
          table: "decision_administrative",
          sourceKey: "onagre-national:decisions:990009",
          values: { type: "Arrêté dérogation", signature_date: "2020-09-14" },
        },
      ];
      const storedReference = other.demandes[0].proposal.dossier.onagre_demande_identifier;
      const [target] = await c
        .trx("dossier")
        .insert({
          source: "demarche_numerique",
          name: p.proposal.name,
          departments: JSON.stringify(["40"]),
          onagre_demande_identifier: storedReference,
        })
        .returning("id");
      await c
        .trx("dossier_user_access")
        .insert({ dossier: target.id, user_id: user.id, access_level: "instruct" });
      const [file] = await c
        .trx("file")
        .insert({ name: "117_test_decree.pdf", size: 10, media_type: "application/pdf" })
        .returning("id");
      await c.trx("decision_administrative").insert({
        dossier: target.id,
        type: "Arrêté dérogation",
        signature_date: "2020-09-14",
        fichier: file.id,
      });
      const current = async () =>
        (await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id])).rows[0]
          .row;
      const original = await current();
      const evidence = await reconciliationEvidence(c, target.id);
      const files = await reviewedFileMetadata(c, original, evidence);
      const originalPath = path.join(directory, "synthetic.pdf");
      const bytes = Buffer.from("%PDF- synthetic regression fixture, not a real decree");
      fs.writeFileSync(originalPath, bytes);
      const decision = {
        action: "link_existing_demande",
        demandeKey: demande.identity.key,
        dossierId: target.id,
        projectHash: reconciliationHash(p),
        targetHash: reconciliationHash(original),
        targetEvidenceHash: reconciliationHash(evidence),
        targetFilesHash: reconciliationHash(files),
        reason:
          "The retained original was manually reviewed against the source and DN record. Preserve the original DN reference and every business field despite the documented discrepancy.",
        matchProfile: "documented_reference_conflict",
        evidence: { fileMetadata: { files, contentRead: false } },
        referenceConflict: {
          sourceReference: demande.proposal.dossier.onagre_demande_identifier,
          storedReference,
          targetTitleQuote: p.proposal.name,
          attachmentName: files[0].name,
          rejectedReferenceReview:
            "The stored reference identifies a different source operation in another location. It is retained for audit but must not cause adoption or linking of the other source demande.",
          ownerDecision: {
            requestId: "synthetic-test",
            quote: "Link the documented demande; preserve the DN code and audit trail",
          },
          original: {
            path: originalPath,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            url: "https://example.invalid/decree.pdf",
            decreeNumber: "117/test",
            physicalPagesRead: [1],
            signatureDate: "2020-09-14",
            clauseReview:
              "Synthetic test-only review of an original identifying the correct source operation, matching its location and decision. This is never evidence for an actual production record.",
          },
        },
      };
      decision.scopeReview = decision.reason;
      const link = () => linkExistingDemandes(c, [{ project: p, decision }], email);
      const quote = decision.referenceConflict.ownerDecision.quote;
      decision.referenceConflict.ownerDecision.quote = "Not approved";
      await assert.rejects(link(), /explicit owner decision/u);
      decision.referenceConflict.ownerDecision.quote = quote;
      fs.appendFileSync(originalPath, "changed");
      await assert.rejects(link(), /original changed/u);
      fs.writeFileSync(originalPath, bytes);
      decision.referenceConflict.original.signatureDate = "2020-09-15";
      await assert.rejects(link(), /signature must match/u);
      decision.referenceConflict.original.signatureDate = "2020-09-14";
      assert.equal((await link())[0].dossierId, target.id);
      assert.equal((await link())[0].status, "unchanged");
      const replay = await importSamples(c, [p], email);
      assert.equal(replay[0].dossierId, target.id);
      assert.deepEqual(replay[0].outcomes, []);
      await assert.rejects(importSamples(c, [other], email), /require reconciliation/u);
      assert.deepEqual(await current(), original);
      const ledger = (
        await c.query(
          "SELECT decision,original_identity FROM onagre_local_import.reconciled_demande WHERE dossier_id=$1",
          [target.id],
        )
      ).rows[0];
      assert.deepEqual(ledger.decision, decision);
      assert.equal(ledger.original_identity.onagre_demande_identifier, storedReference);
      const exclusion = {
        action: "exclude_candidate",
        dossierId: target.id,
        projectHash: reconciliationHash(other),
        targetHash: reconciliationHash(original),
        targetEvidenceHash: reconciliationHash(evidence),
        targetFilesHash: reconciliationHash(files),
        reason:
          "The reviewed original identifies the first operation, whereas this source describes a different operation. Reject only this exact pair, preserving the stored DN code and requiring separate source identity on creation.",
      };
      await recordExcludedCandidates(c, [{ project: other, decision: exclusion }], email);
      await c.trx("file").where({ id: file.id }).update({ name: "Changed original.pdf" });
      await assert.rejects(importSamples(c, [other], email), /file metadata changed/u);
      await c.trx("file").where({ id: file.id }).update({ name: files[0].name });
      const distinct = await importSamples(c, [other], email);
      assert.notEqual(distinct[0].dossierId, target.id);
      assert.equal((await importSamples(c, [other], email))[0].dossierId, distinct[0].dossierId);
      assert.deepEqual(await current(), original);
      await c.trx("dossier").insert({
        source: "demarche_numerique",
        onagre_demande_identifier: storedReference,
      });
      await assert.rejects(importSamples(c, [other], email), /require reconciliation/u);
      await c.finish(false);
    } finally {
      await c.end();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  },
);
