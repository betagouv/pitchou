import { profiles, userName, type User } from "./model.ts";

export const SORT_OPTIONS = [
  { key: "email", label: "Adresse e-mail" },
  { key: "name", label: "Nom" },
  { key: "last_login", label: "Dernière connexion" },
  { key: "groups", label: "Nombre de groupes" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["key"];
export type SortOrder = "asc" | "desc";
export const USERS_PER_PAGE = 20;

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
export function parseQuery(params: URLSearchParams) {
  const sort = params.get("tri");
  const profile = params.get("profil") ?? "";
  return {
    search: params.get("q") ?? "",
    profile: Object.hasOwn(profiles, profile) ? profile : "",
    sort: SORT_OPTIONS.some((option) => option.key === sort)
      ? (sort as SortKey)
      : ("email" as const),
    order: params.get("ordre") === "desc" ? ("desc" as const) : ("asc" as const),
    activePage: positivePage(params.get("actifs")),
    inactivePage: positivePage(params.get("desactives")),
  };
}
const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
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

export { visiblePages } from "$lib/components/pagination.ts";
