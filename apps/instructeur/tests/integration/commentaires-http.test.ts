import { expect, test } from "vitest";
import {
  deleteCommentaireFromCap,
  updateCommentaireFromCap,
} from "@pitchou/server/database/commentaire.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { db } from "../setup/db.ts";
import {
  attachCapToGroupe,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
} from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { mutate } from "./commentaires-http.ts";

test("the author deletes a comment with an attributed audit and latest-comment fallback", async () => {
  const author = await createInstructeurWithDossier(db);
  const { dossier, cap } = author;
  const [older, newest] = await db("commentaire")
    .insert([
      {
        dossier: dossier.id,
        personne: author.id,
        content: "Older comment",
        created_at: new Date("2026-08-01"),
      },
      {
        dossier: dossier.id,
        personne: author.id,
        content: "Newest comment",
        created_at: new Date("2026-08-02"),
      },
    ])
    .returning("*");

  for (const [commentaire, latest] of [
    [newest, older.content],
    [older, null],
  ] as const) {
    expect((await mutate(cap, dossier.id, { id: commentaire.id })).status).toBe(204);
    expect(await db("commentaire").where({ id: commentaire.id })).toEqual([]);

    const list = await fetch(
      `${INTEGRATION_BASE_URL}/dossier/${dossier.id}/commentaires?cap=${cap}`,
    ).then((r) => r.json());
    expect(list.map(({ content }: { content: string }) => content)).toEqual(latest ? [latest] : []);
    const full = await fetch(`${INTEGRATION_BASE_URL}/dossier/${dossier.id}?cap=${cap}`).then((r) =>
      r.json(),
    );
    expect(full.latestCommentaire).toBe(latest);
    const summaries = await fetch(`${INTEGRATION_BASE_URL}/dossiers?cap=${cap}`).then((r) =>
      r.json(),
    );
    expect(summaries.find(({ id }: { id: number }) => id === dossier.id).latestCommentaire).toBe(
      latest,
    );
  }

  const actions = await fetch(
    `${INTEGRATION_BASE_URL}/dossier/${dossier.id}/historique?cap=${cap}`,
  ).then((r) => r.json());
  expect(actions).toHaveLength(2);
  expect(actions).toEqual(
    expect.arrayContaining(
      [newest, older].map(({ id }) =>
        expect.objectContaining({
          type: "commentaire_supprime",
          data: { commentaire_id: id },
          author_email: author.email,
          author_petitionnaire: false,
        }),
      ),
    ),
  );
  expect((await mutate(cap, dossier.id, { id: newest.id })).status).toBe(403);
  expect(await db("commentaire").where({ dossier: dossier.id })).toEqual([]);
  expect(await db("action_dossier").where({ dossier: dossier.id })).toHaveLength(2);
});

test("another instructeur cannot edit or delete, including directly through the database helper", async () => {
  const author = await createInstructeurWithDossier(db);
  const other = await createInstructeurWithCapToGroup(db, {
    nomGroupe: "Other instructeur service",
  });
  await attachCapToGroupe(db, other.cap, author.groupeId);
  const [commentaire] = await db("commentaire")
    .insert({
      dossier: author.dossier.id,
      personne: author.id,
      content: "Author's comment",
    })
    .returning("*");

  for (const method of ["PUT", "DELETE"]) {
    const body =
      method === "PUT" ? { id: commentaire.id, content: "Forged edit" } : { id: commentaire.id };
    expect((await mutate(other.cap, author.dossier.id, body, method)).status).toBe(403);
    expect(await db("commentaire").where({ dossier: author.dossier.id })).toEqual([commentaire]);
    expect(await db("action_dossier").where({ dossier: author.dossier.id })).toEqual([]);
  }
  expect(
    await updateCommentaireFromCap(
      other.cap as CapDossierCap,
      author.dossier.id as DossierId,
      commentaire.id,
      "Forged edit",
      db,
    ),
  ).toBe(false);
  expect(
    await deleteCommentaireFromCap(
      other.cap as CapDossierCap,
      author.dossier.id as DossierId,
      commentaire.id,
      db,
    ),
  ).toBe(false);
  expect(await db("commentaire").where({ dossier: author.dossier.id })).toEqual([commentaire]);
  expect(await db("action_dossier").where({ dossier: author.dossier.id })).toEqual([]);
});

test("read-only access cannot mutate even a comment authored by the viewer", async () => {
  const owner = await createInstructeurWithDossier(db);
  const viewer = await createInstructeurWithCapToGroup(db, {
    nomGroupe: "Read-only viewer service",
  });
  const [commentaire] = await db("commentaire")
    .insert({
      dossier: owner.dossier.id,
      personne: viewer.id,
      content: "Before the service changed",
    })
    .returning("*");
  expect((await mutate(viewer.cap, owner.dossier.id, { id: commentaire.id })).status).toBe(403);
  expect(await db("commentaire").where({ dossier: owner.dossier.id })).toEqual([commentaire]);
  expect(await db("action_dossier").where({ dossier: owner.dossier.id })).toEqual([]);
  expect(
    (await mutate(viewer.cap, owner.dossier.id, { id: commentaire.id, content: "Edit" }, "PUT"))
      .status,
  ).toBe(403);
  expect(await db("commentaire").where({ dossier: owner.dossier.id })).toEqual([commentaire]);
  expect(await db("action_dossier").where({ dossier: owner.dossier.id })).toEqual([]);
});

test("an audit failure rolls back the deletion", async () => {
  const author = await createInstructeurWithDossier(db);
  const [commentaire] = await db("commentaire")
    .insert({
      dossier: author.dossier.id,
      personne: author.id,
      content: "Must survive audit failure",
    })
    .returning("*");
  const transaction = await db.transaction();
  try {
    // The constraint and failed deletion remain local to this rolled-back transaction.
    await transaction.raw(
      "ALTER TABLE action_dossier ADD CONSTRAINT reject_comment_deletion_test CHECK (type <> 'commentaire_supprime')",
    );
    await expect(
      deleteCommentaireFromCap(
        author.cap as CapDossierCap,
        author.dossier.id as DossierId,
        commentaire.id,
        transaction,
      ),
    ).rejects.toThrow();
    expect(await transaction("commentaire").where({ dossier: author.dossier.id })).toEqual([
      commentaire,
    ]);
    expect(await transaction("action_dossier").where({ dossier: author.dossier.id })).toEqual([]);
  } finally {
    await transaction.rollback();
  }
});
