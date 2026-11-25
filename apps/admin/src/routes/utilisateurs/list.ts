import { normalize, profiles, userName, type User } from "./model.ts";

export const SORT_OPTIONS = [
  { key: "email", label: "Adresse e-mail" },
  { key: "name", label: "Nom" },
  { key: "last_login", label: "Dernière connexion" },
  { key: "groups", label: "Nombre de groupes" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["key"];
export type SortOrder = "asc" | "desc";
export const USERS_PER_PAGE = 20;
export const NO_GROUP = "aucun";
export const NO_PROFILE = "aucun";

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

export function groupFilterOptions(groups: User["groupes"]) {
  const options = new Map<string, string>();
  for (const group of groups) {
    if (group.active) options.set(group.id, group.name);
  }
  return Array.from(options, ([value, label]) => ({ value, label })).sort((a, b) =>
    collator.compare(a.label, b.label),
  );
}

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
export function parseQuery(
  params: Pick<URLSearchParams, "get">,
  groupeOptions: ReturnType<typeof groupFilterOptions>,
) {
  const sort = params.get("tri");
  const profile = params.get("profil") ?? "";
  const groupe = params.get("groupe") ?? "";
  return {
    search: params.get("q") ?? "",
    profile: profile === NO_PROFILE || Object.hasOwn(profiles, profile) ? profile : "",
    groupe:
      groupe === NO_GROUP || groupeOptions.some((option) => option.value === groupe) ? groupe : "",
    sort: SORT_OPTIONS.some((option) => option.key === sort)
      ? (sort as SortKey)
      : ("email" as const),
    order: params.get("ordre") === "desc" ? ("desc" as const) : ("asc" as const),
    activePage: positivePage(params.get("actifs")),
    inactivePage: positivePage(params.get("desactives")),
  };
}

export function filterUsers(users: User[], query: ReturnType<typeof parseQuery>) {
  const search = normalize(query.search);
  return users.filter((user) => {
    if (query.profile === NO_PROFILE && user.bundles.length > 0) return false;
    if (query.profile && query.profile !== NO_PROFILE && !user.bundles.includes(query.profile))
      return false;
    if (query.groupe) {
      const groupes = user.groupes.filter((group) => group.active);
      if (
        query.groupe === NO_GROUP ? groupes.length > 0 : !groupes.some((g) => g.id === query.groupe)
      )
        return false;
    }
    return normalize(
      `${userName(user)} ${user.email ?? ""} ${user.groupes.map((group) => group.name).join(" ")}`,
    ).includes(search);
  });
}

export function compareUsers(a: User, b: User, sort: SortKey, order: SortOrder) {
  let result = 0;
  if (sort === "last_login") {
    // Accounts that have never connected remain last in either direction.
    if (!a.last_login_at || !b.last_login_at) {
      if (!!a.last_login_at !== !!b.last_login_at) return a.last_login_at ? -1 : 1;
    } else result = new Date(a.last_login_at).getTime() - new Date(b.last_login_at).getTime();
  } else if (sort === "groups") {
    result =
      a.groupes.filter((group) => group.active).length -
      b.groupes.filter((group) => group.active).length;
  } else {
    result = collator.compare(
      sort === "name" ? userName(a) : (a.email ?? ""),
      sort === "name" ? userName(b) : (b.email ?? ""),
    );
  }
  return (
    (order === "desc" ? -result : result) ||
    collator.compare(a.email ?? "", b.email ?? "") ||
    a.id - b.id
  );
}

export { visiblePages } from "#lib/components/pagination.ts";
