import { activityMapping, suggestedActivity } from "@pitchou/common/onagre/activities.ts";
import type { ActivityOption } from "@pitchou/types/onagreActivities.ts";
import type { MappingStatus, OnagreMapping } from "@pitchou/types/onagre.ts";

export class DecisionDraft {
  activityCode = $state("");
  activityMode: boolean;
  suggested = $state(false);
  status = $state<MappingStatus>("todo");
  target = $state("");
  rule = $state("");
  notes = $state("");
  busy = $state(false);
  error = $state("");
  private initial = $state("");
  constructor(mapping: OnagreMapping, activities: ActivityOption[] = []) {
    this.activityMode = activityMapping(mapping);
    this.activityCode = this.activityMode ? suggestedActivity(mapping, activities) : "";
    this.suggested = this.activityMode && !mapping.activity_code && !!this.activityCode;
    this.status = mapping.status;
    this.target = mapping.target || (this.activityCode ? "dossier.main_activite" : "");
    this.rule = mapping.rule;
    this.notes = mapping.notes;
    this.initial = this.serialized;
  }
  private get serialized() {
    return JSON.stringify([this.status, this.target, this.rule, this.notes, this.activityCode]);
  }
  get dirty() {
    return this.serialized !== this.initial;
  }
  markSaved() {
    this.initial = this.serialized;
  }
  chooseActivity(code: string) {
    this.activityCode = code;
    this.suggested = false;
    this.target = code ? "dossier.main_activite" : "";
    if (code && !this.rule.trim())
      this.rule = `Choisir l'activité Pitchou « ${code} » pour cette correspondance.`;
    else if (code)
      this.rule = this.rule.replace(
        /^Choisir l'activité Pitchou « [a-z0-9-]+ »/u,
        `Choisir l'activité Pitchou « ${code} »`,
      );
  }
  validate() {
    if (
      this.activityMode &&
      ((this.status === "validated" && !this.activityCode) ||
        (this.status === "excluded" && this.activityCode))
    ) {
      this.error =
        this.status === "excluded"
          ? "Retirez l'activité choisie pour exclure cette correspondance."
          : "Choisissez une activité Pitchou avant de valider.";
      return "mapping-activity";
    }
    if (this.status === "validated" && !this.target.trim()) {
      this.error = "Choisissez une destination Pitchou avant de valider.";
      return "mapping-target";
    }
    if ((this.status === "validated" || this.status === "excluded") && !this.rule.trim()) {
      this.error =
        this.status === "excluded"
          ? "Expliquez pourquoi cette information est exclue."
          : "Précisez la règle de reprise avant de valider.";
      return "mapping-rule";
    }
    this.error = "";
    return null;
  }
}
