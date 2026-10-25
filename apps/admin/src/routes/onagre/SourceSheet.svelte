<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Select from "@pitchou/ui/Select.svelte";
  import type { PageData } from "./$types";
  let { content }: { content: NonNullable<PageData["sourceDocument"]> } = $props();
  let search = $derived(content.search);
  function navigate(changes: Record<string, string>) {
    const params = new URLSearchParams(page.url.searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    void goto(`?${params}`, { reset: false });
  }
</script>

<section class="admin-panel source-sheet">
  <div class="source-sheet-controls">
    <div class="onagre-field">
      <label for="source-sheet">Feuille</label><Select
        id="source-sheet"
        value={content.sheet?.sheet_index ?? 0}
        options={content.sheets.map((sheet) => ({
          value: sheet.sheet_index,
          label: sheet.name,
          hint: `${sheet.row_count.toLocaleString("fr-FR")} lignes renseignées`,
        }))}
        onChange={(sheet) => navigate({ sheet: String(sheet), sourcePage: "", sourceSearch: "" })}
      />
    </div>
    <form
      onsubmit={(event) => {
        event.preventDefault();
        navigate({ sourceSearch: search, sourcePage: "" });
      }}
    >
      <div class="onagre-field">
        <label for="source-search">Rechercher dans cette feuille</label><input
          id="source-search"
          type="search"
          class="fr-input"
          bind:value={search}
          maxlength="200"
        />
      </div>
      <button class="fr-btn fr-btn--secondary" type="submit">Rechercher</button>
    </form>
  </div>
  <p class="onagre-context">
    Valeurs affichées du fichier, sans appliquer de correspondance. Les numéros de ligne du fichier
    sont conservés ; seules les lignes entièrement vides sont masquées. L'original conserve la mise
    en forme et les formules.
  </p>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to focus this region to scroll wide sheets.) -->
  <div class="source-grid-scroll" tabindex="0" role="region" aria-label="Contenu de la feuille">
    <table>
      <thead
        ><tr
          ><th scope="col">Ligne</th>{#each content.sheet?.columns ?? [] as column}<th scope="col"
              >{column}</th
            >{/each}</tr
        ></thead
      >
      <tbody
        >{#each content.rows as row}<tr
            ><th scope="row">{row.row_number}</th>{#each content.sheet?.columns ?? [] as _, i}<td
                >{row.cells[i] ?? ""}</td
              >{/each}</tr
          >{/each}</tbody
      >
    </table>
  </div>
  {#if !content.rows.length}<p>Aucune ligne ne correspond à cette recherche.</p>{/if}
  <nav class="source-pagination" aria-label="Pagination du fichier">
    <span
      >{content.total ? (content.page - 1) * 25 + 1 : 0} à {Math.min(
        content.page * 25,
        content.total,
      )} sur {content.total.toLocaleString("fr-FR")}</span
    >
    <div>
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--sm"
        disabled={content.page === 1}
        onclick={() => navigate({ sourcePage: String(content.page - 1) })}>Précédente</button
      ><span>{content.page} / {content.pages}</span><button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--sm"
        disabled={content.page === content.pages}
        onclick={() => navigate({ sourcePage: String(content.page + 1) })}>Suivante</button
      >
    </div>
  </nav>
</section>
