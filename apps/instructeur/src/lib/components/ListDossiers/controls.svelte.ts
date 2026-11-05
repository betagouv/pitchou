import { buildActiveFilterChips } from "./filterChips.ts";
import type { ListDossiersProps } from "./props.ts";
import type { DossiersQuery, SortKey, SortOrder } from "./listModel.ts";
import {
  buildDossiersSearchParams,
  buildSearchEvent,
  copyDossiersQuery,
  readDossiersQuery,
  serviceLabel,
} from "./listModel.ts";
import { sendDossierSearchEvent } from "#lib/shared/aarri.ts";
import { page } from "$app/state";
import { goto } from "$app/navigation";
import { untrack, onDestroy } from "svelte";
import { navigateDossiers } from "./navigation.ts";
import { createListCollection } from "./collection.svelte.ts";
import { loadFilterSpecies } from "./species.svelte.ts";

class DossiersControls {
  private getProps!: () => ListDossiersProps;
  private props = $derived(this.getProps());
  private serverMode = $derived(!!this.props.server);
  query = $derived.by(() => {
    const query = readDossiersQuery(new URLSearchParams(page.url.searchParams.toString()));
    if (this.props.followedOnly) query.localisation = "assigned";
    return query;
  });
  draft = $state<DossiersQuery>(readDossiersQuery(new URLSearchParams()));
  modalOpen = $state(false);
  statusMessage = $state("");
  private filterParamsAtOpening = "";
  private searchVersion = 0;
  private statusTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingSearch = $state<DossiersQuery>();
  collection = createListCollection(
    () => this.props,
    () => this.query,
  );
  numberFiltered = $derived(
    this.props.server?.result?.total ?? this.collection.groupedDossiers.length,
  );
  displayedDossiers = $derived(
    this.serverMode ? this.props.dossiers : this.collection.groupedDossiers,
  );
  private activiteLabels = $derived(
    this.props.server?.options
      ? new Map(this.props.server.options.activites.map(({ code, label }) => [code, label]))
      : this.collection.activiteLabelByCode,
  );
  chips = $derived(
    this.serverMode
      ? buildActiveFilterChips(this.query, this.activiteLabels, this.collection.especeLabelByCD_REF)
      : this.collection.chips,
  );

  constructor(getProps: () => ListDossiersProps) {
    this.getProps = getProps;
    this.trackQuery();
    this.trackFilters();
    this.trackFeedback();
    onDestroy(() => {
      this.searchVersion++;
      clearTimeout(this.statusTimer);
    });
  }

  navigate = (next: DossiersQuery) =>
    navigateDossiers(goto, page.url.pathname, next, !this.serverMode);
  onSort = (sort: SortKey, order: SortOrder) =>
    this.navigate({ ...copyDossiersQuery(this.query), sort, order });

  applySearch = async (next: DossiersQuery) => {
    const version = ++this.searchVersion;
    await this.navigate(next);
    if (version !== this.searchVersion || this.props.loading || this.props.loadError) return;
    if (this.serverMode) {
      this.pendingSearch = next;
      return;
    }
    sendDossierSearchEvent(
      buildSearchEvent(next, this.numberFiltered, this.collection.analyticsContext),
    );
    this.announce(next);
  };

  private announce(query: DossiersQuery) {
    this.statusMessage = `${this.numberFiltered} ${serviceLabel(query.localisation, this.props.followedOnly)}`;
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => (this.statusMessage = ""), 400);
  }

  openFilters = () => {
    this.draft = copyDossiersQuery(this.query);
    this.filterParamsAtOpening = buildDossiersSearchParams({ ...this.query, page: 1 }).toString();
    this.modalOpen = true;
  };

  private filterTarget() {
    const unchanged =
      buildDossiersSearchParams({ ...this.draft, page: 1 }).toString() ===
      this.filterParamsAtOpening;
    return { ...copyDossiersQuery(this.draft), page: unchanged ? this.draft.page : 1 };
  }

  closeFilters = () => {
    this.modalOpen = false;
    void this.navigate(this.filterTarget());
  };

  applyFilters = () => {
    this.modalOpen = false;
    void this.applySearch({ ...copyDossiersQuery(this.draft), page: 1 });
  };

  private trackQuery() {
    $effect(() => {
      if (this.query.espece.length > 0) untrack(() => void loadFilterSpecies().catch(() => {}));
    });
    $effect(() => {
      const params = buildDossiersSearchParams(this.query).toString();
      untrack(() => {
        if (this.modalOpen && params !== buildDossiersSearchParams(this.draft).toString())
          this.modalOpen = false;
      });
    });
  }

  private trackFilters() {
    $effect(() => {
      if (!this.modalOpen) return;
      const target = this.filterTarget();
      if (!this.serverMode) {
        untrack(() => this.navigate(target));
        return;
      }
      const timer = setTimeout(() => untrack(() => this.navigate(target)), 300);
      return () => clearTimeout(timer);
    });
  }

  private trackFeedback() {
    $effect(() => {
      const server = this.props.server;
      if (!server || server.busy || this.props.loadError || !server.result || !this.pendingSearch)
        return;
      if (
        buildDossiersSearchParams(this.pendingSearch).toString() !==
        buildDossiersSearchParams(this.query).toString()
      )
        return;
      sendDossierSearchEvent(
        buildSearchEvent(this.query, this.numberFiltered, {
          ...this.collection.analyticsContext,
          instructeurCount: server.options?.instructeurs.length ?? 0,
          activiteLabelByCode: this.activiteLabels,
        }),
      );
      this.announce(this.query);
      this.pendingSearch = undefined;
    });
  }
}

export const createListControls = (getProps: () => ListDossiersProps) =>
  new DossiersControls(getProps);
