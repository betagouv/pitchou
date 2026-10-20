import {
  involvementLabels,
  type DossierActeur,
  type Involvement,
} from "@pitchou/types/dossierActeur.ts";
import { identityPropertyLabels, type FieldChange } from "@pitchou/types/notification.ts";

type Property = keyof typeof identityPropertyLabels | "address";

export type ActeurRow = {
  property: Property;
  label: string;
  value: string | null;
  /** One change per involvement of the acteur whose property changed. */
  changes: FieldChange[];
};
export type ActeurBlock = { title: string; rows: ActeurRow[] };

const involvementOrder = Object.keys(involvementLabels) as Involvement[];
const properties: Property[] = ["last_name", "first_names", "role", "email", "phone", "address"];
const alwaysShown: Property[] = ["last_name", "first_names", "email"];
const emptyPersonne = {
  first_names: null,
  last_name: null,
  email: null,
  address: null,
  phone: null,
  role: null,
};

const byOrder = (a: Involvement, b: Involvement) =>
  involvementOrder.indexOf(a) - involvementOrder.indexOf(b);

function block(
  acteur: DossierActeur,
  modifiedFields: Map<string, FieldChange>,
  porteurInvolvements: Involvement[],
): ActeurBlock {
  const involvements = [...acteur.involvements].sort(byOrder);
  const rows = properties.flatMap((property) => {
    const value = acteur[property] || null;
    const changes = involvements.flatMap((involvement) => {
      if (porteurInvolvements.includes(involvement)) return [];
      const change = modifiedFields.get(`${involvement}.${property}`);
      return change ? [change] : [];
    });
    if (!value && !changes.length && !alwaysShown.includes(property)) return [];
    const label = property === "address" ? "Adresse" : identityPropertyLabels[property];
    return [{ property, label, value, changes }];
  });
  return {
    // involvement is free text in the database, an unknown one keeps its raw value.
    title: involvements
      .map((involvement) => involvementLabels[involvement] ?? involvement)
      .join(" · "),
    rows,
  };
}

/**
 * One block per acteur, then one per involvement that has pending changes but no acteur
 * anymore (e.g. a mandataire removed), so that its changes can still be acknowledged.
 * The changes of `porteurInvolvements` are shown by the porteur block instead.
 */
export function acteurBlocks(
  acteurs: DossierActeur[],
  modifiedFields: Map<string, FieldChange>,
  porteurInvolvements: Involvement[] = [],
): ActeurBlock[] {
  const sorted = [...acteurs].sort((a, b) =>
    byOrder([...a.involvements].sort(byOrder)[0], [...b.involvements].sort(byOrder)[0]),
  );
  const held = new Set(acteurs.flatMap(({ involvements }) => involvements));
  const removed = involvementOrder.filter(
    (involvement) =>
      !held.has(involvement) &&
      !porteurInvolvements.includes(involvement) &&
      [...modifiedFields.keys()].some((field) => field.startsWith(`${involvement}.`)),
  );
  return [
    ...sorted.map((acteur) => block(acteur, modifiedFields, porteurInvolvements)),
    ...removed.map((involvement) =>
      block({ involvements: [involvement], ...emptyPersonne }, modifiedFields, porteurInvolvements),
    ),
  ];
}
