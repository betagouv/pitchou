import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { untrack } from "svelte";
import { createTextFilter } from "$lib/dossier/textFilters.ts";
import { phases, prochaineActionAttenduePar } from "$lib/dossier/displayDossier.ts";
import { sendEvenement } from "$lib/shared/aarri.ts";
import { createSuiviInstructionSorts } from "./sorts.ts";
import { persistSuiviState, trackSuiviSearch } from "./analytics.ts";
import { displayedSuiviPage, suiviPageSelectors } from "./pagination.ts";
import { DEFAULT_SUIVI_PHASES } from "./defaults.ts";
import type {
  DossierSummary,
  DossierPhase,
  DossierNextActionExpectedFrom,
} from "@pitchou/types/API_Pitchou.ts";
import type { FiltersLocalStorage, TableSort } from "@pitchou/types/interfaceUtilisateur.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";

export const NO_INSTRUCTEUR = "(aucun instructeur)" as const;
export const NO_ACTIVITY = "(aucune activité principale)" as const;
export const NO_NEXT_ACTION = "(vide)" as const;
type Props = {
  email: string;
  dossiers: DossierSummary[];
  followRelations: PitchouState["followRelations"];
  activities: string[];
  selectedSortId?: TableSort["id"];
  filters: Partial<FiltersLocalStorage>;
  remember: any;
};

export class SuiviInstructionState {
  email: string;
  dossiers: DossierSummary[];
  followRelations: PitchouState["followRelations"];
  remember: any;
  selectedDossiers: DossierSummary[] = $state([]);
  selectedPage = $state(1);
  selectedSort: TableSort | undefined = $state();
  text = $state("");
  phaseOptions = new SvelteSet([...phases]);
  selectedPhases: Set<DossierPhase> = $state(new SvelteSet());
  nextActionOptions = new SvelteSet([...prochaineActionAttenduePar, NO_NEXT_ACTION]);
  selectedNextActions: Set<DossierNextActionExpectedFrom | typeof NO_NEXT_ACTION> = $state(
    new SvelteSet(),
  );
  selectedInstructeurs: Set<string> = $state(new SvelteSet());
  activityOptions: Set<string> = $state(new SvelteSet());
  selectedActivities: Set<string> = $state(new SvelteSet());
  filters = new SvelteMap<string, (dossier: DossierSummary) => boolean>();
  activitySorts: TableSort[];
  nameSorts: TableSort[];
  locationSorts: TableSort[];
  ownerSorts: TableSort[];
  prioritySorts: TableSort[];
  sorts: TableSort[];
  constructor(props: Props) {
    this.email = props.email;
    this.dossiers = props.dossiers;
    this.followRelations = props.followRelations;
    this.remember = props.remember;
    this.selectedPhases = untrack(
      () => new SvelteSet(props.filters.phases ?? DEFAULT_SUIVI_PHASES),
    );
    this.selectedNextActions = untrack(
      () => new SvelteSet(props.filters["prochaine action attendue de"] ?? this.nextActionOptions),
    );
    this.activityOptions = new SvelteSet([NO_ACTIVITY, ...props.activities]);
    this.selectedActivities = untrack(
      () => new SvelteSet(props.filters.activitesPrincipales ?? this.activityOptions),
    );
    this.selectedInstructeurs = untrack(
      () => new SvelteSet(props.filters.instructeurs ?? this.instructeurOptions),
    );
    this.text = untrack(() => props.filters.texte ?? "");
    const sorts = createSuiviInstructionSorts(
      () => this.selectedDossiers,
      (value) => (this.selectedDossiers = value),
    );
    this.activitySorts = sorts.activity;
    this.nameSorts = sorts.name;
    this.locationSorts = sorts.location;
    this.ownerSorts = sorts.owner;
    this.prioritySorts = sorts.priority;
    this.sorts = sorts.all;
    this.selectedSort =
      this.sorts.find((sort) => sort.id === props.selectedSortId) ?? this.prioritySorts[0];
    this.installFilters();
  }
  get instructeurOptions() {
    return new SvelteSet([
      this.email,
      NO_INSTRUCTEUR,
      ...(this.followRelations ? [...this.followRelations.keys()].sort() : []),
    ]);
  }
  get followedByMe() {
    return this.followRelations?.get(this.email) ?? new SvelteSet<number>();
  }
  get withoutFollower() {
    let ids = new Set(this.dossiers.map((dossier) => dossier.id));
    for (const followed of this.followRelations?.values() ?? []) ids = ids.difference(followed);
    return ids;
  }
  get unselectedInstructeurs() {
    return this.instructeurOptions.difference(this.selectedInstructeurs);
  }
  get unselectedNextActions() {
    return this.nextActionOptions.difference(this.selectedNextActions);
  }
  get unselectedActivities() {
    return this.activityOptions.difference(this.selectedActivities);
  }
  get pageSelectors(): [undefined, ...(() => void)[]] | undefined {
    return suiviPageSelectors(this.selectedDossiers.length, (page) => (this.selectedPage = page));
  }
  get displayed() {
    return displayedSuiviPage(
      this.selectedDossiers,
      this.selectedPage,
      Boolean(this.pageSelectors),
    );
  }
  installFilters() {
    this.filters.set("phase", (dossier) => this.selectedPhases.has(dossier.phase));
    this.filters.set("next", (dossier) =>
      dossier.next_action_expected_from
        ? this.selectedNextActions.has(
            dossier.next_action_expected_from as DossierNextActionExpectedFrom,
          )
        : this.selectedNextActions.has(NO_NEXT_ACTION),
    );
    this.filters.set("activity", (dossier) =>
      dossier.main_activite
        ? this.selectedActivities.has(dossier.main_activite)
        : this.selectedActivities.has(NO_ACTIVITY),
    );
    this.filters.set(
      "instructeur",
      (dossier) =>
        (this.selectedInstructeurs.has(NO_INSTRUCTEUR) && this.withoutFollower.has(dossier.id)) ||
        [...this.selectedInstructeurs].some((email) =>
          this.followRelations?.get(email)?.has(dossier.id),
        ),
    );
  }
  apply() {
    this.selectedDossiers = this.dossiers.filter((dossier) =>
      [...this.filters.values()].every((filter) => filter(dossier)),
    );
    this.selectedSort?.sort();
  }
  track() {
    trackSuiviSearch({
      email: this.email,
      text: this.text,
      resultCount: this.selectedDossiers.length,
      instructeurOptionCount: this.instructeurOptions.size,
      selectedInstructeurs: this.selectedInstructeurs,
      selectedPhases: this.selectedPhases,
      selectedNextActions: this.selectedNextActions,
      selectedActivities: this.selectedActivities,
    });
  }
  updateSet(key: "next" | "instructeur" | "activity", values: Set<any>) {
    if (key === "next") this.selectedNextActions = new SvelteSet(values);
    else if (key === "instructeur") this.selectedInstructeurs = new SvelteSet(values);
    else this.selectedActivities = new SvelteSet(values);
    this.apply();
    this.track();
  }
  togglePhase(phase: DossierPhase) {
    this.selectedPhases.has(phase)
      ? this.selectedPhases.delete(phase)
      : this.selectedPhases.add(phase);
    this.apply();
    this.track();
  }
  search(text: string) {
    this.text = text.trim();
    this.filters.set("text", createTextFilter(this.text, this.dossiers));
    this.apply();
    this.track();
  }
  clearText(event: Event) {
    event.preventDefault();
    this.filters.delete("text");
    this.text = "";
    this.apply();
  }
  onlyMine() {
    this.updateSet("instructeur", new Set([this.email]));
    sendEvenement({ type: "afficherLesDossiersSuivis" });
  }
  persist() {
    persistSuiviState(this.remember, this.selectedSort, this);
  }
}
