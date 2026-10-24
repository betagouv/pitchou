import type { SourceRow } from "@pitchou/types/onagre.ts";

// Decode PostgreSQL COPY text once. Escaped backslashes must stay literal.
export function decodeCopyValue(value: string): string | null {
  if (value === "\\N") return null;
  const escapes: Record<string, string> = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v" };
  return value.replaceAll(
    /(?:\\(?:[0-7]{1,3}|x[0-9a-fA-F]{1,2}))+|\\(.)/gu,
    (match, code: string | undefined) => {
      if (code !== undefined) return escapes[code] ?? code;
      const bytes = [...match.matchAll(/\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3})/gu)].map((part) =>
        part[1].startsWith("x") ? parseInt(part[1].slice(1), 16) : parseInt(part[1], 8),
      );
      return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    },
  );
}

export function readCopyHeader(line: string) {
  const match = /^COPY onagre\.([a-z_]+) \(([^)]+)\) FROM stdin;$/u.exec(line);
  return match ? { name: match[1], columns: match[2].split(", ") } : null;
}

export function readCopyRow(line: string, columns: string[]): SourceRow {
  const values = line.split("\t");
  if (values.length !== columns.length) throw new Error("Invalid COPY column count");
  return Object.fromEntries(
    columns.map((column, index) => [column, decodeCopyValue(values[index])]),
  );
}
