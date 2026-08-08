import { differenceInCalendarWeeks } from "date-fns";
import { directDatabaseConnection } from "../database.ts";
import type { IndicatorsAARRI } from "@pitchou/types/API_Pitchou.ts";
import { calculateIndicatorAcquis } from "./aarri/acquis.ts";
import { calculateIndicatorActif, calculateIndicatorImpact } from "./aarri/seuils.ts";
import { calculateIndicatorRetenu } from "./aarri/retenu.ts";

async function firstEventWeek(): Promise<Date | undefined> {
  const result = await directDatabaseConnection.raw(
    `select date_trunc('week', min(date))::date as week from evenement_metrique`,
  );
  return result.rows[0]?.week ?? undefined;
}

export async function indicatorsAARRI(): Promise<IndicatorsAARRI[]> {
  const premiereSemaine = await firstEventWeek();
  const nbSemainesObservees = premiereSemaine
    ? differenceInCalendarWeeks(new Date(), premiereSemaine, { weekStartsOn: 1 }) + 2
    : 5;
  const acquis = await calculateIndicatorAcquis(nbSemainesObservees);
  const actifs = await calculateIndicatorActif(nbSemainesObservees);
  const retenus = await calculateIndicatorRetenu(premiereSemaine ?? new Date());
  const impacts = await calculateIndicatorImpact(nbSemainesObservees);
  return [...acquis.keys()].map((date) => ({
    date,
    nombreUtilisateuriceAcquis: acquis.get(date) ?? 0,
    nombreUtilisateuriceActif: actifs.get(date) ?? 0,
    nombreUtilisateuriceRetenu: retenus.get(date) ?? 0,
    nombreUtilisateuriceImpact: impacts.get(date) ?? 0,
    nombreBaseUtilisateuricePotentielle: 300,
  }));
}
