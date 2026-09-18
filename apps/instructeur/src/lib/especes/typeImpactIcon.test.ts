import { expect, test } from "vitest";
import { REFERENTIEL_ATTENDU } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.fixture.ts";
import { typeImpactIconUrl } from "@pitchou/ui/especes/typeImpactIcon.ts";
import destructionIcon from "@pitchou/ui/especes/icons/impact/P-1.svg?url";

// Vite inlines small SVGs as data URLs, so the tests only check presence and identity.

test("every type d'impact of the referentiel has an icon", () => {
  for (const { identifiantPitchou } of REFERENTIEL_ATTENDU.typesImpact) {
    expect(typeImpactIconUrl(identifiantPitchou), identifiantPitchou).toBeTruthy();
  }
});

test("icons are distinct per type d'impact", () => {
  const urls = REFERENTIEL_ATTENDU.typesImpact.map((t) => typeImpactIconUrl(t.identifiantPitchou));
  expect(new Set(urls).size).toBe(urls.length);
  expect(typeImpactIconUrl("P-1")).toBe(destructionIcon);
});

test.each<string | null | undefined>([null, undefined, "", "P-999"])(
  "%s has no icon",
  (identifiant) => {
    expect(typeImpactIconUrl(identifiant)).toBeUndefined();
  },
);
