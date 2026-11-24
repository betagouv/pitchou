import { formatISO } from "date-fns";
import { directDatabaseConnection } from "../../database.ts";
import { EVENEMENTS_MODIFICATIONS } from "./constants.ts";

type ProxyCounts = { proxyImpact: number; proxyRetention: number };

// Events between any two snapshot boundaries contribute to the same counts.
// Group them first so the running totals only process the grouped counts.
export async function calculateProxyIndicators(
  weeks: string[],
  observedAt: Date,
  database = directDatabaseConnection,
): Promise<Map<string, ProxyCounts>> {
  const result: {
    rows: { week: Date; proxy_impact: string; proxy_retention: string }[];
  } = await database.raw(
    `
      with snapshots as (
        select week, cutoff - interval '30 days' as window_start, cutoff + interval '1 microsecond' as window_end
        from unnest(:weeks::date[]) as weeks(week)
        cross join lateral (
          select least((week + 7)::timestamptz - interval '1 microsecond', :observed_at) as cutoff
        ) as cutoffs
      ), boundaries as (
        select array_agg(boundary order by boundary) as times
        from (
          select window_start as boundary from snapshots
          union
          select window_end from snapshots
        ) as times
      ), snapshot_buckets as (
        -- Each boundary starts a new bucket. Include only buckets before the boundary.
        select week,
          width_bucket(window_start, times) - 1 as before_window,
          width_bucket(window_end, times) - 1 as through_window
        from snapshots cross join boundaries
      ), bucket_activity as materialized (
        select e.personne, width_bucket(e.date, times) as bucket,
          count(*) as modifications, bool_or(e.evenement = 'ajouterContrôle') as added_controle
        from evenement_metrique as e
        join auth_user as u on u.id = e.personne
        cross join boundaries
        where e.evenement = any(:modifications::text[])
          and e.date <= :observed_at
          and u.email not ilike '%@beta.gouv.fr'
        group by e.personne, bucket
      ), running_totals as (
        select personne, bucket,
          sum(modifications) over (partition by personne order by bucket) as modifications,
          added_controle
        from bucket_activity
      ), activity_by_person as materialized (
        select array_agg(bucket order by bucket) as occupied_buckets,
          array_agg(modifications order by bucket) as running_modifications,
          min(bucket) filter (where added_controle) as first_controle
        from running_totals
        group by personne
      )
      select week, counts.*
      from snapshot_buckets
      cross join lateral (
        select count(*) filter (where first_controle <= through_window) as proxy_impact,
          count(*) filter (
            where coalesce(running_modifications[through_index], 0)
              - coalesce(running_modifications[before_index], 0) >= 5
          ) as proxy_retention
        from activity_by_person
        cross join lateral (
          -- An index of zero looks up no prior activity, which counts as zero.
          select width_bucket(before_window, occupied_buckets) as before_index,
            width_bucket(through_window, occupied_buckets) as through_index
        ) as cutoff_indexes
      ) as counts
    `,
    {
      weeks: weeks.map((week) => formatISO(new Date(week), { representation: "date" })),
      observed_at: observedAt,
      modifications: EVENEMENTS_MODIFICATIONS,
    },
  );

  return new Map(
    result.rows.map(({ week, proxy_impact, proxy_retention }) => [
      week.toISOString(),
      { proxyImpact: Number(proxy_impact), proxyRetention: Number(proxy_retention) },
    ]),
  );
}
