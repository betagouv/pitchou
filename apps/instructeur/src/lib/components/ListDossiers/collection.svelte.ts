import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DossiersContext, DossiersQuery } from "./query.ts";
import { buildDossiersSearchParams, readDossiersQuery, DEFAULT_PAGE_SIZE } from "./query.ts";
import { filterDossiers } from "./filtering.ts";
import { sortDossiers } from "./sorting.ts";
import { groupDossiersByProjet } from "./projects.ts";
import { buildActiveFilterChips } from "./filterChips.ts";
import {
  activiteLabelByCode as activityLabels,
  especeLabelByCD_REF as especeLabels,
  listAvailableInstructeurs,
} from "./filterOptions.ts";
import type { ListDossiersProps } from "./props.ts";
import { store } from "#lib/state/store.svelte.ts";

export function createListCollection(
  getProps: () => ListDossiersProps,
  getQuery: () => DossiersQuery,
) {
  return createDossiersCollection({
    get dossiers() {
      const props = getProps();
      return props.server || props.loading || props.loadError ? [] : props.dossiers;
    },
    get query() {
      return getQuery();
    },
    get context() {
      const props = getProps();
      return {
        followedOnly: props.followedOnly,
        notificationByDossier: props.notificationByDossier,
        followRelations: props.followRelations,
        especeByCD_REF: store.espèceByCD_REF,
      };
    },
    get email() {
      return getProps().email ?? "";
    },
  });
}

type Sources = {
  dossiers: DossierSummary[];
  query: DossiersQuery;
  context: DossiersContext;
  email: string;
};

export function createDossiersCollection(sources: Sources) {
  const context = $derived(sources.context);
  // Keep the filter dependency stable when only pagination or sorting changes.
  const filterParams = $derived(
    buildDossiersSearchParams({
      ...sources.query,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      sort: "depositDate",
      order: "desc",
    }).toString(),
  );
  const filteringQuery = $derived(readDossiersQuery(new URLSearchParams(filterParams)));
  const filteredDossiers = $derived(filterDossiers(sources.dossiers, filteringQuery, context));
  const sort = $derived(sources.query.sort);
  const order = $derived(sources.query.order);
  const sortedDossiers = $derived(
    sortDossiers(filteredDossiers, { sort, order }, context.notificationByDossier),
  );
  const groupedDossiers = $derived(groupDossiersByProjet(sortedDossiers));
  const activiteLabelByCode = $derived(activityLabels(sources.dossiers));
  const especeLabelByCD_REF = $derived(especeLabels(context.especeByCD_REF));
  const chips = $derived(
    buildActiveFilterChips(sources.query, activiteLabelByCode, especeLabelByCD_REF),
  );
  const analyticsContext = $derived({
    instructeurCount: listAvailableInstructeurs(context.followRelations).length,
    email: sources.email,
    activiteLabelByCode,
    especeLabelByCD_REF,
  });
  return {
    get chips() {
      return chips;
    },
    get sortedDossiers() {
      return sortedDossiers;
    },
    get groupedDossiers() {
      return groupedDossiers;
    },
    get activiteLabelByCode() {
      return activiteLabelByCode;
    },
    get especeLabelByCD_REF() {
      return especeLabelByCD_REF;
    },
    get analyticsContext() {
      return analyticsContext;
    },
  };
}
