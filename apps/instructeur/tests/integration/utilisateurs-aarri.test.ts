import { expect, test, describe } from "vitest";

import { db } from "../setup/db.ts";
import { createPersonne } from "../factories/index.ts";
import { getUtilisateursAARRI } from "@pitchou/server/database/utilisateursAARRI.ts";

import type { ÉvènementMétrique } from "@pitchou/types/évènement.d.ts";

// A fixed Wednesday so several events for one personne land in the same week.
const WEEK_DAY = new Date("2026-02-04T12:00:00.000Z");

async function ajouterÉvènements(
  personneId: number,
  type: ÉvènementMétrique["type"],
  count: number,
  date: Date = WEEK_DAY,
): Promise<void> {
  const rows = Array.from({ length: count }, () => ({
    personne: personneId,
    évènement: type,
    date,
  }));
  await db("évènement_métrique").insert(rows);
}

describe("getUtilisateursAARRI", () => {
  test("computes the AARRI level of each Pitchou account", async () => {
    await createPersonne(db, { email: "base@dept.gouv.fr", nom: "Base" });
    const acquis = await createPersonne(db, { email: "acquis@dept.gouv.fr", nom: "Acquis" });
    const actif = await createPersonne(db, { email: "actif@dept.gouv.fr", nom: "Actif" });
    const impact = await createPersonne(db, { email: "impact@dept.gouv.fr", nom: "Impact" });

    await ajouterÉvènements(acquis.id, "seConnecter", 1);
    await ajouterÉvènements(actif.id, "modifierPrescription", 5);
    await ajouterÉvènements(impact.id, "retourÀLaConformité", 1);

    const utilisateurs = await getUtilisateursAARRI(db);
    const byEmail = new Map(utilisateurs.map((u) => [u.email, u]));

    expect(byEmail.get("base@dept.gouv.fr")?.niveau).toBe("base");
    expect(byEmail.get("acquis@dept.gouv.fr")?.niveau).toBe("acquis");
    expect(byEmail.get("actif@dept.gouv.fr")?.niveau).toBe("actif");
    expect(byEmail.get("impact@dept.gouv.fr")?.niveau).toBe("impact");

    // A personne with no event has no actions and no last activity.
    expect(byEmail.get("base@dept.gouv.fr")).toMatchObject({
      actionCount: 0,
      lastActivityDate: null,
    });
    // Modification actions are counted, and the last activity date is filled.
    expect(byEmail.get("actif@dept.gouv.fr")?.actionCount).toBe(5);
    expect(byEmail.get("actif@dept.gouv.fr")?.lastActivityDate).not.toBeNull();
  });

  test("excludes personnes that are not Pitchou accounts (no code d'accès)", async () => {
    await createPersonne(db, { email: "instructeur@dept.gouv.fr" });
    // A contact with no code d'accès, inserted directly to bypass the factory default.
    await db("personne").insert({ email: "petitionnaire@exemple.fr", code_accès: null });

    const utilisateurs = await getUtilisateursAARRI(db);
    const emails = utilisateurs.map((u) => u.email);

    expect(emails).toContain("instructeur@dept.gouv.fr");
    expect(emails).not.toContain("petitionnaire@exemple.fr");
  });

  test("excludes the team's own accounts (@beta.gouv.fr)", async () => {
    await createPersonne(db, { email: "instructeur@dept.gouv.fr" });
    await createPersonne(db, { email: "membre@beta.gouv.fr" });

    const utilisateurs = await getUtilisateursAARRI(db);
    const emails = utilisateurs.map((u) => u.email);

    expect(emails).toContain("instructeur@dept.gouv.fr");
    expect(emails).not.toContain("membre@beta.gouv.fr");
  });
});
