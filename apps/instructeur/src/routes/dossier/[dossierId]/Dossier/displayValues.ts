export function displayBool(b: boolean | null | undefined): string {
  return b ? "Oui" : "Non";
}

export function displayNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) {
    return "Non-défini";
  }

  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return "Non-défini";
  }

  return n.toString();
}

export function displayString(s: string | undefined | null): string {
  if (s === undefined || s === null || s === "") {
    return "(vide)";
  }

  return s;
}
