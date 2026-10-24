import type { MappingStatus, OnagreMapping } from "@pitchou/types/onagre.ts";

export class DecisionDraft {
  status = $state<MappingStatus>("todo");
  target = $state("");
  rule = $state("");
  notes = $state("");
  busy = $state(false);
  error = $state("");
  private initial = $state("");
  constructor(mapping: OnagreMapping) {
    this.status = mapping.status;
    this.target = mapping.target;
    this.rule = mapping.rule;
    this.notes = mapping.notes;
    this.initial = this.serialized;
  }
  private get serialized() {
    return JSON.stringify([this.status, this.target, this.rule, this.notes]);
  }
  get dirty() {
    return this.serialized !== this.initial;
  }
  markSaved() {
    this.initial = this.serialized;
  }
  validate() {
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
