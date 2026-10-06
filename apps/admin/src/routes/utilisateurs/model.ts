import type { PermissionBundle } from "@pitchou/types/permissions.ts";
import type { PageData } from "./$types";

export type User = Omit<PageData["users"][number], "groupes"> & {
  groupes: { id: string; name: string; active: boolean }[];
};
export const profiles: Record<PermissionBundle, { label: string; description: string }> = {
  instructeur: {
    label: "Instructeur",
    description: "Consulte les dossiers et instruit ceux de ses groupes.",
  },
  administrateur: {
    label: "Administrateur",
    description: "Gère les données, les utilisateurs et les groupes de Pitchou.",
  },
};
export function profileLabel(bundle: string) {
  return profiles[bundle as PermissionBundle]?.label ?? bundle;
}
export function userName(user: User) {
  return (
    [user.first_names, user.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "Compte historique"
  );
}
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
