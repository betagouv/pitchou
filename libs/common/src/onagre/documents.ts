import * as XLSX from "xlsx";

export function readDocumentSheets(filename: string, bytes: Uint8Array) {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const workbook = isCsv
    ? XLSX.read(new TextDecoder("utf-8", { fatal: true }).decode(bytes), {
        type: "string",
        raw: true,
      })
    : XLSX.read(bytes, { cellDates: false });
  return workbook.SheetNames.map((name, index) => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
    if (range.e.r > 100000 || range.e.c > 200) throw new Error(`Sheet too large: ${name}`);
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: true,
      raw: false,
    });
    const rows = raw
      .map((cells, offset) => ({
        row_number: range.s.r + offset + 1,
        cells: cells.map((cell) => String(cell ?? "")),
      }))
      .filter((row) => row.cells.some((cell) => cell.trim()));
    const width = Math.max(
      1,
      ...rows.map((row) => row.cells.findLastIndex((cell) => cell !== "") + 1),
    );
    return {
      index,
      name,
      columns: Array.from({ length: width }, (_, i) => XLSX.utils.encode_col(range.s.c + i)),
      rows: rows.map((row) => ({ ...row, cells: row.cells.slice(0, width) })),
    };
  });
}
