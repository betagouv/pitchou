import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connect, initialize } from "../connection.mjs";
import { reconciliationHash, reconciliationEvidence } from "../linked.mjs";
import { reviewedTarget } from "./review.mjs";
import { reviewedFileMetadata } from "./files.mjs";

test(
  "a review relying on file metadata rejects renamed or newly attached evidence",
  {
    skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1",
  },
  async () => {
    const c = await connect(process.env);
    try {
      await c.begin();
      await initialize(c);
      const code = `2099-metadata-${randomUUID()}`;
      const [target] = await c
        .trx("dossier")
        .insert({
          source: "demarche_numerique",
          onagre_demande_identifier: code,
        })
        .returning("id");
      const [file] = await c
        .trx("file")
        .insert({
          name: "Site-specific opinion.pdf",
          size: 1,
          media_type: "application/pdf",
        })
        .returning("id");
      const [opinion] = await c
        .trx("avis_expert")
        .insert({
          dossier: target.id,
          expert: "CSRPN",
          avis_fichier: file.id,
        })
        .returning("id");
      const current = (
        await c.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [target.id])
      ).rows[0].row;
      const evidence = await reconciliationEvidence(c, target.id);
      const files = await reviewedFileMetadata(c, current, evidence);
      assert.equal(files.length, 1);
      const demande = { proposal: { dossier: { onagre_demande_identifier: code } } };
      const decision = {
        dossierId: target.id,
        targetHash: reconciliationHash(current),
        targetEvidenceHash: reconciliationHash(evidence),
        targetFilesHash: reconciliationHash(files),
      };
      assert.deepEqual(await reviewedTarget(c, {}, demande, decision), current);
      await c.trx("file").where({ id: file.id }).update({ name: "Different site.pdf" });
      await assert.rejects(reviewedTarget(c, {}, demande, decision), /file metadata changed/u);
      await c.trx("file").where({ id: file.id }).update({ name: "Site-specific opinion.pdf" });
      const [second] = await c
        .trx("file")
        .insert({ name: "New evidence.pdf", size: 2 })
        .returning("id");
      await c.trx("avis_expert").where({ id: opinion.id }).update({ saisine_fichier: second.id });
      await assert.rejects(reviewedTarget(c, {}, demande, decision), /Target evidence changed/u);
      decision.targetEvidenceHash = reconciliationHash(await reconciliationEvidence(c, target.id));
      await assert.rejects(reviewedTarget(c, {}, demande, decision), /file metadata changed/u);
      await c.finish(false);
    } finally {
      await c.end();
    }
  },
);
