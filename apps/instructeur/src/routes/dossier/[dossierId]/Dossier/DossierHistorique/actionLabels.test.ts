import { describe, expect, test } from "vitest";

import { actionDisplay } from "./actionLabels.ts";

describe("historique — dates de consultation du public", () => {
  test("only the changed end date is bold, the start stays as plain context", () => {
    const display = actionDisplay("dates_consultation_renseignees", {
      start: "2026-08-20",
      end: "2026-08-29",
      start_changed: false,
      end_changed: true,
    });

    expect(display.valuePrefix).toBe("20/08/2026 → ");
    expect(display.value).toBe("29/08/2026");
    expect(display.valueSuffix).toBeUndefined();
  });

  test("only the changed start date is bold, the end stays as plain context", () => {
    const display = actionDisplay("dates_consultation_renseignees", {
      start: "2026-08-20",
      end: "2026-08-29",
      start_changed: true,
      end_changed: false,
    });

    expect(display.valuePrefix).toBeUndefined();
    expect(display.value).toBe("20/08/2026");
    expect(display.valueSuffix).toBe(" → 29/08/2026");
  });

  test("a date still unknown shows as « ? » in the plain context", () => {
    const display = actionDisplay("dates_consultation_renseignees", {
      start: null,
      end: "2026-08-29",
      start_changed: false,
      end_changed: true,
    });

    expect(display.valuePrefix).toBe("? → ");
    expect(display.value).toBe("29/08/2026");
  });

  test("both dates changed at once are both bold", () => {
    const display = actionDisplay("dates_consultation_renseignees", {
      start: "2026-08-20",
      end: "2026-08-29",
      start_changed: true,
      end_changed: true,
    });

    expect(display.value).toBe("20/08/2026 → 29/08/2026");
  });

  test("actions recorded before the flags existed keep the whole période bold", () => {
    const display = actionDisplay("dates_consultation_renseignees", {
      start: "2026-08-20",
      end: null,
    });

    expect(display.valuePrefix).toBeUndefined();
    expect(display.value).toBe("20/08/2026 → ?");
    expect(display.valueSuffix).toBeUndefined();
  });
});
