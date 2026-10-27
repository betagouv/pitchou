<script lang="ts">
  import type { GroupPreview } from "@pitchou/types/groupRouting.ts";
  let { preview }: { preview: GroupPreview } = $props();
</script>

<section class="fr-alert fr-alert--info" aria-label="Aperçu des affectations" aria-live="polite">
  <h3 class="fr-alert__title">Aperçu des affectations</h3>
  <p>
    {preview.added.count} dossier(s) ajouté(s), {preview.removed.count} dossier(s) retiré(s). Aucun e-mail
    d'arrivée ne sera envoyé pour ce recalcul.
  </p>
  {#each [{ label: "Ajouts", result: preview.added }, { label: "Retraits", result: preview.removed }] as item}
    {#if item.result.count}
      <details>
        <summary>{item.label} · {item.result.count}</summary>
        <ul>
          {#each item.result.dossiers as dossier}
            <li>
              <a href={`/dossiers/${dossier.id}`} target="_blank" rel="noreferrer"
                >{dossier.name || `Dossier ${dossier.id}`} · #{dossier.id}</a
              >
            </li>
          {/each}
        </ul>
        {#if item.result.count > item.result.dossiers.length}<p>
            Les 100 premiers dossiers sont affichés.
          </p>{/if}
      </details>
    {/if}
  {/each}
</section>
