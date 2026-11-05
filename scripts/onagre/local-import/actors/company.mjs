import { writeRecord } from "../writer.mjs";
import { identity } from "./identity.mjs";

export async function writeCompany(client, porteur) {
  const key = `onagre-national:entreprise:${porteur.siret}`;
  const owned = await identity(client, key, key);
  const current = (
    await client.query("SELECT * FROM entreprise WHERE siret=$1 FOR UPDATE", [porteur.siret])
  ).rows[0];
  if (!owned && current)
    return {
      sourceKey: key,
      table: "entreprise",
      targetId: porteur.siret,
      status: "unchanged",
      preserved: Object.keys(porteur.values).filter(
        (field) => current[field] !== porteur.values[field],
      ),
    };
  return writeRecord(
    client,
    key,
    key,
    "entreprise",
    { ...porteur.values, siren: porteur.siret.slice(0, 9) },
    { siret: porteur.siret },
  );
}
