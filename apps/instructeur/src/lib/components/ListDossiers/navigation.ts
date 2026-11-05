import { buildDossiersSearchParams, type DossiersQuery } from "./listModel.ts";

export function navigateDossiers(
  goto: (url: string, options: any) => unknown,
  pathname: string,
  next: DossiersQuery,
  replace = true,
) {
  const search = buildDossiersSearchParams(next).toString();
  return goto(search ? `?${search}` : pathname, {
    replace,
    reset: false,
  });
}
