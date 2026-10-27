import { departements } from "./departements.ts";
import type { GroupRule } from "@pitchou/types/groupRouting.ts";

export function parseGroupRules(value: unknown): GroupRule[] {
  if (!Array.isArray(value) || value.length > 50)
    throw new TypeError("Liste de règles invalide, 50 règles maximum");
  const departmentCodes = new Set(departements.map((d) => d.code));
  return value.map((rule: unknown) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule))
      throw new TypeError("Règle invalide");
    const input = rule as Record<string, unknown>;
    const result = {} as GroupRule;
    for (const key of ["departments", "communes", "activites"] as const) {
      const values = input[key];
      if (
        !Array.isArray(values) ||
        values.length > 1000 ||
        values.some((v) => typeof v !== "string" || !v || v.length > 200)
      )
        throw new TypeError("Critère invalide");
      result[key] = [...new Set(values)] as string[];
    }
    if (
      result.departments.length === 0 &&
      result.communes.length === 0 &&
      result.activites.length === 0
    )
      throw new TypeError("Une règle doit contenir au moins un critère");
    if (result.departments.some((d) => !departmentCodes.has(d)))
      throw new TypeError("Département inconnu");
    if (result.communes.some((code) => !/^(?:\d{5}|2[AB]\d{3})$/u.test(code)))
      throw new TypeError("Code INSEE de commune invalide");
    return result;
  });
}
