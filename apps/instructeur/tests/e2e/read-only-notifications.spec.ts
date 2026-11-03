import { changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import {
  createCapDossier,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
  createPersonne,
} from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";
import { expect, test } from "../fixtures/playwright.ts";

const internalNote = "Note interne confidentielle du service propriétaire";
const internalComment = "Commentaire libre confidentiel du service propriétaire";
const description = "Description du projet modifiée par le pétitionnaire";

for (const access of ["lecture_complete", "lecture"] as const) {
  for (const novelty of ["arrival", "follow"] as const) {
    test(`${access} acknowledges ${novelty} after five seconds and reviews applicant changes personally`, async ({
      page,
      db,
      loginAs,
    }) => {
      const owner = await createInstructeurWithDossier(db, {
        dossierNom: `Projet ${access} ${novelty}`,
        nomGroupe: "Service propriétaire",
      });
      const reader =
        access === "lecture"
          ? await createInstructeurWithCapToGroup(db, { nomGroupe: "Autre service" })
          : await createPersonne(db);
      if (access === "lecture_complete") {
        await createCapDossier(db, reader.codeAcces);
        await changeDossierAccess(db, (routingTrx) =>
          routingTrx("dossier_user_access").insert({
            dossier: owner.dossier.id,
            user_id: reader.id,
            access_level: "read",
          }),
        );
        expect(await db("user_groupe").where({ user_id: reader.id })).toHaveLength(0);
      }
      await db("dossier").where({ id: owner.dossier.id }).update({
        description,
        free_comment: internalComment,
      });
      await db("commentaire").insert({ dossier: owner.dossier.id, content: internalNote });
      const [action] = await db("action_dossier")
        .insert({
          dossier: owner.dossier.id,
          type: "champ_modifie",
          author_petitionnaire: true,
          data: JSON.stringify({ field: "Description", column: "description", notification: true }),
        })
        .returning("id");
      await attachPersonneSuitDossier(db, reader.id, owner.dossier.id);
      if (novelty === "follow") {
        await db("notification")
          .where({ personne: reader.id, dossier: owner.dossier.id })
          .update({ arrival_viewed: true });
      }

      await loginAs(reader.codeAcces);
      const payloadResponse = await page.request.get(`/dossier/${owner.dossier.id}`, {
        headers: { Accept: "application/json" },
      });
      expect(payloadResponse.ok()).toBe(true);
      const payload = await payloadResponse.json();
      expect(payload.access).toBe(access);
      expect(payload.notificationSnapshot.changes).toMatchObject([
        { column: "description", revisions: [action.id] },
      ]);
      if (access === "lecture") {
        expect(JSON.stringify(payload)).not.toContain(internalNote);
        expect(JSON.stringify(payload)).not.toContain(internalComment);
        expect(payload.latestCommentaire).toBeNull();
      } else {
        expect(payload.latestCommentaire).toBe(internalNote);
      }

      await page.goto("/mes-dossiers");
      const card = page.getByTestId("card-dossier").filter({ hasText: owner.dossier.name! });
      const badge = novelty === "arrival" ? "Nouveau dossier" : "Nouveau suivi";
      await expect(card.getByText(badge, { exact: true })).toBeVisible();
      await card.getByRole("link", { name: owner.dossier.name!, exact: true }).click();
      await page.getByRole("tab", { name: "Détail du projet", exact: true }).click();
      const projectTab = page.getByRole("tab", { name: "Détail du projet", exact: true });
      await expect(page.getByText("Dossier en lecture seule", { exact: true })).toBeVisible();
      await expect(projectTab).toHaveAccessibleDescription("Modifications non lues");
      await expect(page.getByText(badge, { exact: true })).toBeVisible();
      await expect(page.getByText(badge, { exact: true })).toHaveCount(0, { timeout: 10000 });
      await expect
        .poll(async () => {
          const row = await db("notification")
            .where({ personne: reader.id, dossier: owner.dossier.id })
            .first();
          return { arrival: row.arrival_viewed, follow: row.follow_revision };
        })
        .toEqual({ arrival: true, follow: null });
      expect(await db("notification_review").where({ action: action.id })).toHaveLength(0);

      for (const name of [
        /Plus d’actions/u,
        "Actions du dossier",
        "Repasser en mode édition",
        "Ajouter une pièce jointe",
        "Ajouter un avis ou une saisine",
        "Rajouter une décision administrative",
      ]) {
        await expect(
          page.getByRole("button", { name, exact: true, includeHidden: true }),
        ).toHaveCount(0);
      }
      await expect(page.getByLabel("Laissez un commentaire")).toHaveCount(0);
      if (access === "lecture") {
        await expect(page.getByRole("tab", { name: "Historique", exact: true })).toHaveCount(0);
        await expect(page.getByText(internalNote, { exact: true })).toHaveCount(0);
        await expect(page.getByText(internalComment, { exact: true })).toHaveCount(0);
      }

      await page.getByRole("button", { name: /Informations du projet/u }).click();
      await expect(page.getByText(description, { exact: true })).toBeVisible();
      const review = page.getByRole("button", { name: "Valider la modification : Description" });
      await expect(review).toHaveText("Vu");
      await review.click();
      await expect(review).toHaveCount(0);
      await expect(projectTab).not.toHaveAccessibleDescription("Modifications non lues");
      await expect
        .poll(() => db("notification_review").where({ action: action.id }).select("personne"))
        .toEqual([{ personne: reader.id }]);
      await page.reload();
      await expect(projectTab).not.toHaveAccessibleDescription("Modifications non lues");
      await page.getByRole("button", { name: /Informations du projet/u }).click();
      await expect(page.getByText(description, { exact: true })).toBeVisible();
      await expect(review).toHaveCount(0);
      await page.goto("/mes-dossiers");
      await expect(card).toBeVisible();
      await expect(card.getByText(/^(Nouveau dossier|Nouveau suivi|Modifié)/u)).toHaveCount(0);
    });
  }
}
