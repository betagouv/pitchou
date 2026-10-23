import { expect, test } from "vitest";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { getDossiersForExport } from "@pitchou/server/database/dossier/export.ts";
import {
  getDossierFull,
  getDossiersSummariesForUser,
  getEvenementsPhaseDossiers,
} from "@pitchou/server/database/dossier.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin/detail.ts";
import { listDossiersForAdmin } from "@pitchou/server/database/dossier_admin/list.ts";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { sessionUserId } from "../helpers/auth.ts";

test.each([false, true])(
  "equal phase timestamps agree across exports, summaries and histories, reverse insert %s",
  async (reverse) => {
    const user = await createInstructeurWithDossier(db);
    const userId = sessionUserId(user.cap);
    const dossierId = user.dossier.id as DossierId;
    await db("evenement_phase_dossier").where({ dossier: dossierId }).delete();
    const events = [
      {
        dossier: dossierId,
        phase: "Instruction",
        timestamp: new Date("2025-02-01T00:00:00.400Z"),
        caused_by_personne: user.id,
      },
      {
        dossier: dossierId,
        phase: "Contrôle",
        timestamp: new Date("2025-02-01"),
        caused_by_personne: null,
      },
    ];
    await db("evenement_phase_dossier").insert(reverse ? events.toReversed() : events);
    const assertPhase = async (expected: string) => {
      expect((await getDossiersForExport(userId, "service", [dossierId], db))?.[0].phase).toBe(
        expected,
      );
      expect((await getDossiersSummariesForUser(userId, db))[0].phase).toBe(expected);
      expect((await getDossierFull(dossierId, userId, db))?.evenementsPhase[0].phase).toBe(
        expected,
      );
      expect((await getEvenementsPhaseDossiers(userId, db))[0].phase).toBe(expected);
      expect((await getDossierDetailForAdmin(dossierId, db)).phase).toBe(expected);
      expect((await listDossiersForAdmin({ page: 1, pageSize: 10 }, db)).dossiers[0].phase).toBe(
        expected,
      );
    };
    await assertPhase("Contrôle");
    // A genuinely newer event still takes priority, even when it goes back a phase.
    await db("evenement_phase_dossier").insert({ ...events[0], timestamp: new Date("2025-02-02") });
    await assertPhase("Instruction");
  },
);
