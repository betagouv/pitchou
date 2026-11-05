export function columnDescriptions(sql: string): Map<string, string> {
  const descriptions = new Map<string, string>();
  for (const table of sql.matchAll(/CREATE TABLE onagre\.([a-z_]+) \(\n([\s\S]*?)\n\);/gu)) {
    for (const line of table[2].split("\n")) {
      const column = /^\s+([a-z_][a-z0-9_]*) (.+?)(?:,)?$/u.exec(line);
      if (column) descriptions.set(`${table[1]}.${column[1]}`, column[2]);
    }
  }
  for (const comment of sql.matchAll(
    /COMMENT ON COLUMN onagre\.([a-z_]+)\.([a-z_][a-z0-9_]*) IS '((?:''|[^'])*)';/gu,
  )) {
    const key = `${comment[1]}.${comment[2]}`;
    descriptions.set(key, `${descriptions.get(key) ?? ""} · ${comment[3].replaceAll("''", "'")}`);
  }
  return descriptions;
}
