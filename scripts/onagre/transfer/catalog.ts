// This allowlist deliberately excludes the import ledger and every application/auth table.
export const tables = [
  {
    name: "onagre_snapshot",
    columns:
      "id fingerprint filename workbook_fingerprint tables workbook_mappings created_at records_complete",
    sequence: true,
  },
  {
    name: "onagre_mapping",
    columns:
      "key section label context proposal confidence notes target rule status version updated_at",
  },
  {
    name: "onagre_shared_rule",
    columns: "key title rule notes status version updated_at",
  },
  {
    name: "onagre_source_demande",
    columns: "snapshot_id source_id projet_id code name fingerprint demande projet",
  },
  {
    name: "onagre_source_row",
    columns: "snapshot_id table_name row_number content",
  },
  {
    name: "onagre_document",
    columns: "id filename fingerprint size mime review snapshot_id original text created_at",
    sequence: true,
    batchSize: 1,
  },
  {
    name: "onagre_document_sheet",
    columns: "document_id sheet_index name row_count columns",
  },
  {
    name: "onagre_document_row",
    columns: "document_id sheet_index row_number cells",
  },
  {
    name: "onagre_mapping_revision",
    columns: "id mapping_key actor_id before after created_at",
    sequence: true,
    actor: true,
  },
  {
    name: "onagre_shared_rule_revision",
    columns: "id rule_key actor_id before after created_at",
    sequence: true,
    actor: true,
  },
] satisfies Table[];

export interface Table {
  name: string;
  columns: string;
  sequence?: boolean;
  actor?: boolean;
  batchSize?: number;
}

export type TextRow = Record<string, string | null>;
export const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
export const relation = (name: string) => `public.${quote(name)}`;
export const columnNames = (table: Table) => table.columns.split(" ");
export const revisionActors = `select actor_id from public.onagre_mapping_revision
  union select actor_id from public.onagre_shared_rule_revision`;

// Keep the cursor result in PostgreSQL text form. JS Date would lose timestamp microseconds.
// Text parameters also preserve bigint, bytea and JSON without number coercion.
export const textColumns = (columns: string[]) =>
  columns.map((name) => `${quote(name)}::text as ${quote(name)}`).join(", ");
