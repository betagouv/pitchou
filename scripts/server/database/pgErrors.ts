export function pgUniqueViolation(): Error {
  return Object.assign(new Error(), { code: "23505" });
}
