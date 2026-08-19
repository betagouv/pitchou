import {
  prochaineActionAttenduePar,
  prochainesActionsAttenduesParEntite,
} from "@pitchou/common/phases.ts";

import type {
  DossierNextActionExpected,
  DossierNextActionExpectedFrom,
} from "@pitchou/types/API_Pitchou.ts";

export type NextAction = {
  entity: DossierNextActionExpectedFrom | null;
  action: DossierNextActionExpected | null;
};

export type NextActionGroup = {
  entity: DossierNextActionExpectedFrom;
  options: { value: string; label: string }[];
};

/** Shown when the entity has no more precise action to offer, or none applies. */
const AUTRE = "Autre";

/**
 * The entity and its action travel together in a single `<select>`, so both end
 * up in one option value. « | » never appears in an entity or an action.
 */
export function nextActionValue(entity: string | null, action: string | null): string {
  return entity ? `${entity}|${action ?? ""}` : "";
}

export function parseNextActionValue(value: string): NextAction {
  if (!value) return { entity: null, action: null };
  const separator = value.indexOf("|");
  const entity = (
    separator === -1 ? value : value.slice(0, separator)
  ) as DossierNextActionExpectedFrom;
  const action = separator === -1 ? "" : value.slice(separator + 1);
  return {
    entity: prochaineActionAttenduePar.has(entity) ? entity : null,
    action: (action as DossierNextActionExpected) || null,
  };
}

/**
 * One group per entity in charge, listing its expected actions and always ending
 * with « Autre » — the entity is waited on, without a more precise action.
 */
export const nextActionGroups: NextActionGroup[] = [...prochaineActionAttenduePar].map(
  (entity) => ({
    entity,
    options: [
      ...(prochainesActionsAttenduesParEntite.get(entity) ?? []).map((action) => ({
        value: nextActionValue(entity, action),
        label: action,
      })),
      { value: nextActionValue(entity, null), label: AUTRE },
    ],
  }),
);
