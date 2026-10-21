import { expect } from "vitest";
import * as XLSX from "xlsx";

export async function readSpreadsheetRows(response: Response): Promise<(string | number)[][]> {
  expect(response.status).toBe(200);
  const book = XLSX.read(await response.arrayBuffer(), { type: "array", raw: true });
  return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: "" });
}
