import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "#lib/state/store.svelte.ts";
import type { Snippet } from "svelte";
import type { DossiersQuery, FilterChip, SortKey, SortOrder, Localisation } from "./listModel.ts";
import type { DossiersListOptions, DossiersListPage } from "@pitchou/types/dossierList.ts";

export type ServerListState = {
  result?: DossiersListPage;
  options?: DossiersListOptions;
  busy: boolean;
  refresh: () => void;
  follow: (id: DossierSummary["id"]) => Promise<void>;
  leave: (id: DossierSummary["id"]) => Promise<void>;
};

export type ListDossiersProps = {
  title: string;
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
  server?: ServerListState;
  email?: string;
  dossiers: DossierSummary[];
  followRelations?: PitchouState["followRelations"];
  /** Names of the instructeur's services (groupes instructeurs) */
  services?: string[];
  followedOnly?: boolean;
  recentSearches?: string[];
  /** Show the instructeur filter (quick button + modal section), irrelevant on « mes dossiers » */
  showFilterInstructeurice?: boolean;
  showFilterEnjeu?: boolean;
  /** Show the next instruction action filter for followed dossiers */
  showFilterActionInstructeur?: boolean;
  showFilterUnread?: boolean;
  notificationByDossier: PitchouState["notificationByDossier"];
  /** Empty state, overriding the default message. Receives whether the whole (unfiltered) list is empty. */
  emptyListMessage?: Snippet<[{ wholeListEmpty: boolean }]>;
};

export type DossiersToolbarProps = {
  title: string;
  loading?: boolean;
  loadError?: string;
  busy?: boolean;
  searchDebounce?: number;
  exportQuery?: string;
  exportCount?: number;
  searchText: string;
  /** Recent searches offered as suggestions when the search bar is focused */
  recentSearches: string[];
  showFilterInstructeurice: boolean;
  showFilterEnjeu: boolean;
  showFilterActionInstructeur: boolean;
  showFilterUnread: boolean;
  withoutInstructeurActive: boolean;
  enjeuActive: boolean;
  actionInstructeurActive: boolean;
  unreadActive: boolean;
  activeFilterCount: number;
  numberFiltered: number;
  localisation?: Localisation;
  followedOnly?: boolean;
  exportDossierIds?: DossierSummary["id"][];
  /** Active filters shown as removable tags */
  chips: FilterChip[];
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSearch: (text: string) => void;
  onToggleWithoutInstructeur: () => void;
  onToggleEnjeu: () => void;
  onToggleActionInstructeur: () => void;
  onToggleUnread: () => void;
  onOpenFilters: () => void;
  onRemoveFilter: (next: DossiersQuery) => void;
  onSort: (key: SortKey, order: SortOrder) => void;
};
