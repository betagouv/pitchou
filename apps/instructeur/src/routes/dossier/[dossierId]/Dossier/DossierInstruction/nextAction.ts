import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

export const nextActionOptions = [
  { value: "", label: "Non renseignée" },
  ...[...prochaineActionAttenduePar].map((entity) => ({
    value: entity,
    label: entity === "Instructeur" ? "Instructeur-ice (Moi)" : entity,
  })),
];
