import { describe, it, expect } from "vitest";

import {
  computeNiveauAARRI,
  isAcquis,
  isActif,
  isRetenu,
  hasImpact,
  getFirstRetenuWeek,
  niveauAARRIRank,
  NIVEAUX_AARRI,
  type LevelEvent,
} from "./niveau.ts";

// Wednesday noon of week `index`. Week 0 is the week of Monday 2026-01-05.
// Dates are built in local time so they bucket the same way as `startOfWeek`
// (which also works in local time), avoiding timezone-boundary flakiness.
function dayInWeek(index: number): Date {
  return new Date(2026, 0, 7 + 7 * index, 12, 0, 0);
}

// `count` events of `type`, all in week `weekIndex`.
function events(type: LevelEvent["type"], weekIndex: number, count: number): LevelEvent[] {
  return Array.from({ length: count }, () => ({ type, date: dayInWeek(weekIndex) }));
}

const CONSULTATION = "consulterUnDossier";
const MODIFICATION = "modifierPrescription";

describe("isAcquis", () => {
  it("is true when there is a seConnecter event", () => {
    expect(isAcquis([{ type: "seConnecter", date: dayInWeek(0) }])).toBe(true);
  });

  it("is false without any seConnecter event", () => {
    expect(isAcquis(events(MODIFICATION, 0, 10))).toBe(false);
    expect(isAcquis([])).toBe(false);
  });
});

describe("isActif", () => {
  it("is true with 5 modifications in a single week", () => {
    expect(isActif(events(MODIFICATION, 0, 5))).toBe(true);
  });

  it("is false with only 4 modifications in a week", () => {
    expect(isActif(events(MODIFICATION, 0, 4))).toBe(false);
  });

  it("is false when 5 modifications are spread across distinct weeks", () => {
    const spread = [0, 1, 2, 3, 4].flatMap((week) => events(MODIFICATION, week, 1));
    expect(isActif(spread)).toBe(false);
  });

  it("does not count consultations as modifications", () => {
    expect(isActif(events(CONSULTATION, 0, 10))).toBe(false);
  });

  it("counts only modifications when a week mixes both kinds", () => {
    const mixed = [...events(MODIFICATION, 0, 3), ...events(CONSULTATION, 0, 5)];
    expect(isActif(mixed)).toBe(false);
  });
});

describe("hasImpact", () => {
  it("is true with a retourÀLaConformité event", () => {
    expect(hasImpact([{ type: "retourÀLaConformité", date: dayInWeek(0) }])).toBe(true);
  });

  it("is false otherwise", () => {
    expect(hasImpact(events(MODIFICATION, 0, 10))).toBe(false);
  });
});

describe("isRetenu", () => {
  // 5 actions on a week makes it "validated".
  function validatedWeeks(type: LevelEvent["type"], weekIndexes: number[]): LevelEvent[] {
    return weekIndexes.flatMap((week) => events(type, week, 5));
  }

  it("is true with 5 consecutive validated modification weeks", () => {
    expect(isRetenu(validatedWeeks(MODIFICATION, [0, 1, 2, 3, 4]))).toBe(true);
  });

  it("counts consultation actions as well for retention", () => {
    expect(isRetenu(validatedWeeks(CONSULTATION, [0, 1, 2, 3, 4]))).toBe(true);
  });

  it("counts a mix of consultations and modifications towards the weekly threshold", () => {
    // Each week: 3 consultations + 2 modifications = 5 actions => validated.
    const weeks = [0, 1, 2, 3, 4].flatMap((week) => [
      ...events(CONSULTATION, week, 3),
      ...events(MODIFICATION, week, 2),
    ]);
    expect(isRetenu(weeks)).toBe(true);
  });

  it("is false with only 4 validated weeks", () => {
    expect(isRetenu(validatedWeeks(MODIFICATION, [0, 1, 2, 3]))).toBe(false);
  });

  it("is false when weeks have only 4 actions (not validated)", () => {
    const weeks = [0, 1, 2, 3, 4].flatMap((week) => events(MODIFICATION, week, 4));
    expect(isRetenu(weeks)).toBe(false);
  });

  it("is false when 5 validated weeks never fit inside an 8-week window", () => {
    // Validated weeks at 0,2,4,6,8: every 8-week window holds at most 4 of them.
    expect(isRetenu(validatedWeeks(MODIFICATION, [0, 2, 4, 6, 8]))).toBe(false);
  });

  it("is true when 5 validated weeks fit inside one 8-week window", () => {
    // Window [0..7] holds the validated weeks 0,2,4,6,7 => 5.
    expect(isRetenu(validatedWeeks(MODIFICATION, [0, 2, 4, 6, 7]))).toBe(true);
  });
});

describe("getFirstRetenuWeek", () => {
  const weeks = Array.from({ length: 10 }, (_v, i) => `week-${i}`);

  it("returns the last validated week of the first qualifying window", () => {
    const counts = new Map(weeks.map((week, i) => [week, [0, 2, 4, 6, 7].includes(i) ? 5 : 0]));
    expect(getFirstRetenuWeek(counts, 5, 8, weeks, 5)).toBe("week-7");
  });

  it("returns null when no window reaches the validated-weeks threshold", () => {
    const counts = new Map(weeks.map((week, i) => [week, [0, 2, 4, 6, 8].includes(i) ? 5 : 0]));
    expect(getFirstRetenuWeek(counts, 5, 8, weeks, 5)).toBe(null);
  });
});

describe("computeNiveauAARRI", () => {
  it("is base for a personne without any event", () => {
    expect(computeNiveauAARRI([])).toBe("base");
  });

  it("is base when there are only consultations and no connection", () => {
    expect(computeNiveauAARRI(events(CONSULTATION, 0, 3))).toBe("base");
  });

  it("is acquis when the personne only connected", () => {
    expect(computeNiveauAARRI([{ type: "seConnecter", date: dayInWeek(0) }])).toBe("acquis");
  });

  it("is actif with 5 modifications in a week", () => {
    expect(computeNiveauAARRI(events(MODIFICATION, 0, 5))).toBe("actif");
  });

  it("is retenu when validated 5 weeks, even though those weeks also make them actif", () => {
    const retenu = [0, 1, 2, 3, 4].flatMap((week) => events(MODIFICATION, week, 5));
    expect(isActif(retenu)).toBe(true);
    expect(computeNiveauAARRI(retenu)).toBe("retenu");
  });

  it("is impact as soon as there is a retour à la conformité, whatever else", () => {
    const withImpact = [
      { type: "retourÀLaConformité", date: dayInWeek(0) } as LevelEvent,
      ...events(MODIFICATION, 0, 5),
      { type: "seConnecter", date: dayInWeek(0) } as LevelEvent,
    ];
    expect(computeNiveauAARRI(withImpact)).toBe("impact");
  });
});

describe("niveau ranking", () => {
  it("orders the funnel from base to impact", () => {
    expect(NIVEAUX_AARRI).toEqual(["base", "acquis", "actif", "retenu", "impact"]);
  });

  it("gives strictly increasing ranks down the funnel", () => {
    const ranks = NIVEAUX_AARRI.map(niveauAARRIRank);
    expect(ranks).toEqual([0, 1, 2, 3, 4]);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1]);
    }
  });
});
