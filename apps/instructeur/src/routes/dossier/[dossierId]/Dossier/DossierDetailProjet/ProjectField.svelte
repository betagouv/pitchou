<script lang="ts">
  import FieldChange from "./FieldChange.svelte";
  import "./review-layout.css";
  import type { FieldChange as Change } from "@pitchou/types/notification.ts";
  import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { readOnlyMode } from "../readOnly.ts";
  import type { Snippet } from "svelte";
  let {
    dossierId,
    label,
    value,
    change,
    children,
  }: { dossierId: DossierId; label: string; value: unknown; change?: Change; children?: Snippet } =
    $props();
  const readOnly = readOnlyMode();
  const pending = $derived(!readOnly.current && !!change);

  function display(value: unknown): string {
    if (value == null || value === "") return "Non renseigné";
    if (typeof value === "boolean") return value ? "Oui" : "Non";
    if (value instanceof Date) return formatDateAbsolute(value, "dd/MM/yyyy");
    if (Array.isArray(value)) return value.length ? value.map(display).join(", ") : "Non renseigné";
    if (typeof value === "object")
      return Object.values(value)
        .filter((item) => item != null)
        .map(display)
        .join(" · ");
    return String(value);
  }
</script>

<div class="project-field dossier-review-row">
  <div class="field-value" class:pending>
    {#if label}<strong>{label}&nbsp;:</strong>{/if}
    {#if children}{@render children()}{:else}<span class="field-text">{display(value)}</span>{/if}
  </div>
  <FieldChange {dossierId} {change} />
</div>

<style>
  .project-field {
    margin-bottom: 1rem;
    min-width: 0;
  }
  .field-value {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 1rem;
    line-height: 1.5rem;
  }
  .field-text {
    white-space: pre-line;
  }
  .pending {
    background: #ffedbf;
    border-radius: 0.25rem;
    padding: 1rem;
  }
</style>
