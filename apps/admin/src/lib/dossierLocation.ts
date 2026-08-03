type CommuneWithDepartment = { code?: string; departmentCode?: string };

export function communeDepartmentCode(commune: CommuneWithDepartment): string | undefined {
  if (commune.departmentCode) return commune.departmentCode;
  const code = commune.code;
  if (!code) return undefined;
  if (/^(97|98)\d{3}$/.test(code)) return code.slice(0, 3);
  return code.slice(0, 2);
}
