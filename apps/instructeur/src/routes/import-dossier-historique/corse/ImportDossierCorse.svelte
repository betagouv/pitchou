<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
  import { text } from "d3-fetch";
  import ImportDossierCorseResults from "./ImportDossierCorseResults.svelte";
  import { parseCorseImportFile } from "./parseCorseImportFile.ts";
  import { createDossierFromRow, isDossierRowInDatabase } from "./importDossierCorse.ts";
  import type { DossierWithAlerts } from "../importDossierUtils.ts";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { DossierCorseRow } from "./DossierCorseRow.ts";
  import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";
  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

  type Props = { dossiers?: DossierSummary[]; schema: SchemaDemarcheSimplifiee | undefined };
  let { dossiers = [], schema }: Props = $props();
  const namesInDatabase = $derived(new Set(dossiers.map((d) => d.name)));
  const nomToDossierId = $derived(new Map(dossiers.map((d) => [d.name, d.id])));
  const nameToOnagre = $derived(
    new Map(dossiers.map((d) => [d.name, d.onagre_demande_identifier])),
  );
  const activites = $derived(
    new Set(
      schema?.revision.champDescriptors.find((c) => c.label === "Activité principale")?.options,
    ) as Set<DossierDemarcheNumerique88444["Activité principale"]>,
  );
  let allRows: DossierCorseRow[] = $state([]);
  let rowsToImport: DossierCorseRow[] = $state([]);
  let importedRows: DossierCorseRow[] = $state([]);
  let rowToDossier: Map<DossierCorseRow, DossierWithAlerts> = new SvelteMap();
  let emails: Map<string, string> = $state(new SvelteMap());
  let links: Map<any, string> = $state(new SvelteMap());
  let percentage: number | undefined = $state();
  let showAll = $state(false);
  let loading: Promise<void[]> = $state(Promise.resolve([]));
  const alertCount = $derived(
    [...rowToDossier.values()].filter((dossier) => dossier.alertes?.length).length,
  );
  const remaining = $derived(allRows.length - importedRows.length);

  async function handleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const parsed = await parseCorseImportFile(file);
      emails = new SvelteMap(parsed.emails);
      allRows = parsed.rows;
      rowsToImport = allRows.filter(
        (row) => !isDossierRowInDatabase(row, namesInDatabase, nameToOnagre),
      );
      importedRows = allRows.filter((row) =>
        isDossierRowInDatabase(row, namesInDatabase, nameToOnagre),
      );
      percentage = allRows.length ? (importedRows.length / allRows.length) * 100 : 0;
      loading = Promise.all(
        allRows.map(async (row) => {
          rowToDossier.set(row, await createDossierFromRow(row, emails, activites));
        }),
      );
    } catch (error) {
      console.error(`Une erreur est survenue pendant la lecture du fichier : ${error}`);
    }
  }

  async function prepare(row: DossierCorseRow) {
    const dossier = rowToDossier.get(row);
    if (!dossier) return;
    const link = await text("/lien-preremplissage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dossier),
    });
    links.set(row, link);
    links = links;
  }

  const perPage = 20;
  let selectedPage = $state(1);
  const pageSelectors = $derived.by<undefined | [undefined, ...(() => void)[]]>(() => {
    if (allRows.length < perPage * 2 + 1) return undefined;
    return [
      undefined,
      ...Array.from(
        { length: Math.ceil(allRows.length / perPage) },
        (_, i) => () => (selectedPage = i + 1),
      ),
    ];
  });
  $effect(() => {
    if (pageSelectors) selectedPage = 1;
  });
  const displayedRows = $derived.by(() => {
    const selected = showAll ? allRows : rowsToImport;
    return pageSelectors
      ? selected.slice(perPage * (selectedPage - 1), perPage * selectedPage)
      : selected;
  });
</script>

<svelte:head><title>Corse — Import de dossiers — Pitchou</title></svelte:head>
<h1>Import de dossiers historiques Corse</h1>
{#if allRows.length === 0}
  <div class="fr-upload-group fr-mb-4w">
    <label class="fr-label" for="file-upload"
      >Charger un fichier de suivi<span class="fr-hint-text">Formats supportés : .ods</span></label
    ><input
      class="fr-upload"
      type="file"
      id="file-upload"
      name="file-upload"
      accept=".ods"
      onchange={handleFileChange}
    />
  </div>
{:else}
  <ImportDossierCorseResults
    {allRows}
    rows={displayedRows}
    bind:showAll
    {remaining}
    {alertCount}
    {percentage}
    {loading}
    dossiers={rowToDossier}
    {links}
    names={namesInDatabase}
    onagre={nameToOnagre}
    dossierIds={nomToDossierId}
    {prepare}
    {pageSelectors}
    {selectedPage}
  />
{/if}
