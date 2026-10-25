import type { Knex } from "knex";
import type { SourceRow } from "@pitchou/types/onagre.ts";
import type {
  OnagreGroup,
  OnagreServiceMapping,
  OnagreService,
  OnagreServices,
} from "@pitchou/types/onagreServices.ts";
import { hash } from "../import/policy.ts";

export async function serviceRows(
  db: Knex,
  snapshotId: number,
  table: string,
): Promise<SourceRow[]> {
  return (
    await db("onagre_source_row")
      .where({ snapshot_id: snapshotId, table_name: table })
      .orderBy("row_number")
      .select("content")
  ).map((row) => row.content);
}
export async function readGroups(db: Knex): Promise<OnagreGroup[]> {
  return db<OnagreGroup>("onagre_group_catalog").select("*").orderBy("id");
}
export async function loadServiceMappings(db: Knex, snapshotId: number): Promise<OnagreServices> {
  const [rows, regions, mappings, groups] = await Promise.all([
    serviceRows(db, snapshotId, "services"),
    serviceRows(db, snapshotId, "regions"),
    db<OnagreServiceMapping>("onagre_service_mapping").where({
      source_instance: "onagre-national",
    }),
    readGroups(db),
  ]);
  const services: OnagreService[] = rows.map((source) =>
    makeService(source, regions, mappings, groups, false),
  );
  // A later dump must not silently hide decisions for services that disappeared.
  for (const mapping of mappings)
    if (!services.some((service) => service.id === mapping.service_id))
      services.push(makeService(mapping.source, regions, [mapping], groups, true));
  services.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return { services, groups, catalogHash: hash(groups) };
}
function makeService(
  source: SourceRow,
  regions: SourceRow[],
  mappings: OnagreServiceMapping[],
  groups: OnagreGroup[],
  absent: boolean,
): OnagreService {
  const id = Number(source.servicesid),
    sourceHash = hash(source);
  const mapping = mappings.find((row) => row.service_id === id) ?? null;
  const region = regions.find((row) => row.regionsid === source.regionsid);
  return {
    id,
    name: source.nomservice ?? `Service #${id}`,
    region: region?.liblongregion ?? region?.libcourtregion ?? source.regionsid ?? "Sans région",
    endDate: source.datefinservice || null,
    hidden: ["false", "f", "0"].includes(source.view?.toLowerCase() ?? ""),
    source,
    sourceHash,
    mapping,
    absent,
    needsReview:
      !!mapping &&
      (absent ||
        mapping.source_hash !== sourceHash ||
        mapping.group_ids.some((id) => !groups.some((group) => group.id === id && group.active))),
  };
}
