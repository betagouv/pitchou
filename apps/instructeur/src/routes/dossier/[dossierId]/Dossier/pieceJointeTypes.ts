import toJSONPerserveDate from "@pitchou/common/DateToJSON.ts";
import type { TypePieceJointe } from "./savePieceJointe.ts";
import type { FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
import { sendEvenement } from "$lib/shared/aarri.ts";
import type { EvenementPieceJointeSource } from "@pitchou/types/evenement.d.ts";

export function currentAttachmentDate() {
  const date = new Date();
  Object.defineProperty(date, "toJSON", { value: toJSONPerserveDate });
  return date;
}

export function defaultPieceJointeType(
  initial: TypePieceJointe | undefined,
  showChoice: boolean,
  types: TypePieceJointe[],
) {
  return initial ?? (!showChoice ? (types[0] ?? null) : null);
}

export function pieceJointeLabel(value: TypePieceJointe) {
  if (value === "Saisine expert") return "Saisine CNPN / CSRPN";
  if (value === "Avis expert") return "Avis (CNPN, CSRPN, CBN, PNA, etc.)";
  return value;
}

export function saisinesWithoutAvis(items: FrontEndAvisExpert[]) {
  return items.filter(
    (item) =>
      (item.saisine_date !== null || item.saisine_fichier_url !== null) &&
      item.avis === null &&
      item.avis_date === null,
  );
}

export function trackPieceJointe(
  dossierId: number,
  source: EvenementPieceJointeSource,
  typePieceJointe: TypePieceJointe,
  nombreFichiers: number,
) {
  sendEvenement({
    type: "ajouterPieceJointe",
    details: { dossierId, source, typePieceJointe, nombreFichiers },
  });
}
