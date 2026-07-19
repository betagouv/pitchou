import { expect, test, describe } from "vitest";

import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL, TEST_ADMIN_EMAIL } from "../setup/integration-global.ts";
import {
  createPersonne,
  createInstructeurWithCapToGroup,
  createGroupeInstructeurs,
  attachCapToGroupe,
} from "../factories/index.ts";
import { getUtilisateursAARRI } from "@pitchou/server/database/utilisateursAARRI.ts";

import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";
import type { UtilisateurAARRI } from "@pitchou/types/API_Pitchou.ts";

// A fixed Wednesday so several events for one personne land in the same week.
const WEEK_DAY = new Date("2026-02-04T12:00:00.000Z");

async function ajouterEvenements(
  personneId: number,
  type: EvenementMetrique["type"],
  count: number,
  date: Date = WEEK_DAY,
): Promise<void> {
  const rows = Array.from({ length: count }, () => ({
    personne: personneId,
    evenement: type,
    date,
  }));
  await db("evenement_metrique").insert(rows);
}

describe("getUtilisateursAARRI", () => {
  test("computes the AARRI level of each Pitchou account", async () => {
    await createPersonne(db, { email: "base@dept.gouv.fr", last_name: "Base" });
    const acquis = await createPersonne(db, { email: "acquis@dept.gouv.fr", last_name: "Acquis" });
    const actif = await createPersonne(db, { email: "actif@dept.gouv.fr", last_name: "Actif" });
    const impact = await createPersonne(db, { email: "impact@dept.gouv.fr", last_name: "Impact" });

    await ajouterEvenements(acquis.id, "seConnecter", 1);
    await ajouterEvenements(actif.id, "modifierPrescription", 5);
    await ajouterEvenements(impact.id, "retourÀLaConformité", 1);

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

  test("lists the groupes instructeurs of each personne, sorted", async () => {
    // In two groupes, "Beta" and "Alpha", to check the list comes back sorted.
    const { cap } = await createInstructeurWithCapToGroup(db, {
      email: "deux-groupes@dept.gouv.fr",
      nomGroupe: "Beta",
    });
    const autreGroupe = await createGroupeInstructeurs(db, { name: "Alpha" });
    await attachCapToGroupe(db, cap, autreGroupe.id);

    // Belongs to no groupe.
    await createPersonne(db, { email: "sans-groupe@dept.gouv.fr" });

    const utilisateurs = await getUtilisateursAARRI(db);
    const byEmail = new Map(utilisateurs.map((u) => [u.email, u]));

    expect(byEmail.get("deux-groupes@dept.gouv.fr")?.groupesInstructeurs).toEqual([
      "Alpha",
      "Beta",
    ]);
    expect(byEmail.get("sans-groupe@dept.gouv.fr")?.groupesInstructeurs).toEqual([]);
  });

  test("excludes personnes that are not Pitchou accounts (no code d'accès)", async () => {
    await createPersonne(db, { email: "instructeur@dept.gouv.fr" });
    // A contact with no code d'accès, inserted directly to bypass the factory default.
    await db("personne").insert({ email: "petitionnaire@exemple.fr", access_code: null });

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

describe("GET /api/admin/utilisateurs-aarri", () => {
  async function createAdmin(): Promise<string> {
    const code = `admin-secret-${Math.random().toString(36).slice(2)}`;
    await createPersonne(db, { email: TEST_ADMIN_EMAIL, access_code: code });
    return code;
  }

  function appeler(secret?: string): Promise<Response> {
    const url = new URL(`${INTEGRATION_BASE_URL}/api/admin/utilisateurs-aarri`);
    if (secret !== undefined) url.searchParams.set("secret", secret);
    return fetch(url);
  }

  test("returns the users for an admin secret", async () => {
    const adminCode = await createAdmin();
    const instructeur = await createPersonne(db, { email: "instructeur@dept.gouv.fr" });
    await ajouterEvenements(instructeur.id, "seConnecter", 1);

    const res = await appeler(adminCode);
    expect(res.status).toBe(200);

    const body: UtilisateurAARRI[] = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const instructeurRow = body.find((u) => u.email === "instructeur@dept.gouv.fr");
    expect(instructeurRow?.niveau).toBe("acquis");
  });

  test("answers 403 for a non-admin secret", async () => {
    const instructeur = await createPersonne(db, {
      email: "instructeur@dept.gouv.fr",
      access_code: "non-admin-secret",
    });
    expect(instructeur.codeAcces).toBe("non-admin-secret");

    const res = await appeler("non-admin-secret");
    expect(res.status).toBe(403);
  });

  test("answers 403 for an unknown secret", async () => {
    const res = await appeler("does-not-exist");
    expect(res.status).toBe(403);
  });

  test("answers 400 when the secret is missing", async () => {
    const res = await appeler();
    expect(res.status).toBe(400);
  });
});
