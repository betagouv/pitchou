import { differenceInCalendarWeeks } from "date-fns";
import { directDatabaseConnection } from "../database.ts";
import type { IndicatorsAARRI } from "@pitchou/types/API_Pitchou.ts";
import { calculateIndicatorAcquis } from "./aarri/acquis.ts";
import { calculateProxyIndicators } from "./aarri/proxy.ts";
import { calculateIndicatorActif, calculateIndicatorImpact } from "./aarri/seuils.ts";
import { calculateIndicatorRetenu } from "./aarri/retenu.ts";

async function getObservation(): Promise<{ week: Date | null; observed_at: Date }> {
  const result = await directDatabaseConnection.raw(
    `select date_trunc('week', min(date))::date as week, now() as observed_at from evenement_metrique`,
  );
  return result.rows[0];
}

export async function indicatorsAARRI(): Promise<IndicatorsAARRI[]> {
  const { week: premiereSemaine, observed_at: observedAt } = await getObservation();
  const nbSemainesObservees = premiereSemaine
    ? differenceInCalendarWeeks(observedAt, premiereSemaine, { weekStartsOn: 1 }) + 2
    : 5;
  const acquis = await calculateIndicatorAcquis(nbSemainesObservees, observedAt);
  const actifs = await calculateIndicatorActif(nbSemainesObservees);
  const retenus = await calculateIndicatorRetenu(premiereSemaine ?? new Date());
  const impacts = await calculateIndicatorImpact(nbSemainesObservees);
  const weeks = [...acquis.keys()];
  const proxies = await calculateProxyIndicators(weeks, observedAt);
  return weeks.map((date) => ({
    date,
    nombreUtilisateuriceAcquis: acquis.get(date) ?? 0,
    nombreUtilisateuriceActif: actifs.get(date) ?? 0,
    nombreUtilisateuriceRetenu: retenus.get(date) ?? 0,
    nombreUtilisateuriceImpact: impacts.get(date) ?? 0,
    nombreUtilisateuriceProxyImpact: proxies.get(date)?.proxyImpact ?? 0,
    nombreUtilisateuriceProxyRetenu: proxies.get(date)?.proxyRetention ?? 0,
    nombreBaseUtilisateuricePotentielle: 300,
  }));
}
