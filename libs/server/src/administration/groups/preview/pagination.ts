import { GROUP_PREVIEW_PAGE_SIZE, type PreviewCategory } from "@pitchou/types/groupRouting.ts";

export type PreviewPageRequest = { category: PreviewCategory; page: number; token: string };

export class StaleGroupPreviewError extends Error {
  constructor() {
    super("Les affectations ont changé. Actualisez l'aperçu avant de continuer.");
  }
}

export function validatePreviewPage(value: PreviewPageRequest): void {
  // Dossier IDs are positive PostgreSQL integers. No valid page needs a larger offset.
  const maximumPage = Math.ceil(2_147_483_647 / GROUP_PREVIEW_PAGE_SIZE);
  if (
    !["added", "removed", "upgraded", "downgraded"].includes(value.category) ||
    !Number.isSafeInteger(value.page) ||
    value.page < 1 ||
    value.page > maximumPage ||
    typeof value.token !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.token)
  )
    throw new TypeError("Pagination de l'aperçu invalide");
}

export function parsePreviewPage(query: URLSearchParams): PreviewPageRequest | undefined {
  if (query.size === 0) return undefined;
  if (
    [...query.keys()].some((key) => !["category", "page", "token"].includes(key)) ||
    ["category", "page", "token"].some((key) => query.getAll(key).length !== 1) ||
    !/^[1-9]\d*$/u.test(query.get("page") ?? "")
  )
    throw new TypeError("Pagination de l'aperçu invalide");
  const value = {
    category: query.get("category") as PreviewCategory,
    page: Number(query.get("page")),
    token: query.get("token")!,
  };
  validatePreviewPage(value);
  return value;
}
