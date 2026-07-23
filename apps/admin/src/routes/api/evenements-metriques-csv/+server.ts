import type { RequestHandler } from "./$types";
import { getAllEvenementsWithEmail } from "@pitchou/server/database/evenements_metriques.ts";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async () => {
  const rows = await getAllEvenementsWithEmail();

  const lines = [
    "email,groupes instructeurs,date,évènement,détails",
    ...rows.map((row) =>
      [
        csvEscape(row.email),
        csvEscape((row.groupesInstructeurs ?? []).join(" ; ")),
        (row.date instanceof Date ? row.date : new Date(row.date)).toISOString().slice(0, 10),
        csvEscape(row.evenement),
        csvEscape(row.details),
      ].join(","),
    ),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const filename = `evenements_metriques_${today}.csv`;

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
};
