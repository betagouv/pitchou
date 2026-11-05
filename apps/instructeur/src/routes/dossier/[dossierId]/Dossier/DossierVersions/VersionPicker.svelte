<script lang="ts">
  import { untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import type {
    DemandeRevision,
    DemandeVersion,
    DossierDemande,
  } from "@pitchou/types/dossierDemandes.ts";
  import { fetchVersionData, versionDate } from "./api.ts";

  let {
    id,
    label,
    demandes,
    initialDemandeId,
    onChange,
    onLabelChange,
  }: {
    id: string;
    label: string;
    demandes: DossierDemande[];
    initialDemandeId: number;
    onChange: (version: DemandeVersion | undefined) => void;
    onLabelChange: (label: string) => void;
  } = $props();
  let demandeId = $state(untrack(() => initialDemandeId));
  let revision = $state("current");
  let revisions = $state<DemandeRevision[]>([]);
  let errorMessage = $state("");
  let loading = $state(false);
  const demandeOptions = $derived(
    demandes.map((demande) => ({ value: demande.id, label: demande.label, hint: demande.phase })),
  );
  const stateOptions = $derived([
    { value: "current", label: "État actuel", hint: "Dernières données de la demande" },
    ...revisions.map((item, index) => ({
      value: item.id,
      label: `État ${revisions.length - index} · ${versionDate(item.recorded_at)}`,
      hint:
        index === revisions.length - 1 ? "Premier état conservé · Lecture seule" : "Lecture seule",
    })),
  ]);
  $effect(() => {
    onLabelChange(
      `${demandes.find((demande) => demande.id === demandeId)?.label ?? "Demande"} — ${stateOptions.find((item) => item.value === revision)?.label ?? "État"}`,
    );
  });
  $effect(() => {
    const controller = new AbortController();
    revisions = [];
    void fetchVersionData<DemandeRevision[]>(`/dossier/${demandeId}/versions`, controller.signal)
      .then((result) => {
        revisions = result;
      })
      .catch((error) => {
        if (!controller.signal.aborted) errorMessage = error.message;
      });
    return () => controller.abort();
  });
  $effect(() => {
    const controller = new AbortController();
    loading = true;
    errorMessage = "";
    onChange(undefined);
    void fetchVersionData<DemandeVersion>(
      `/dossier/${demandeId}/versions?revision=${revision}`,
      controller.signal,
    )
      .then((result) => {
        onChange(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) errorMessage = error.message;
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false;
      });
    return () => controller.abort();
  });
</script>

<fieldset
  class="min-w-0 rounded-lg border border-[var(--border-default-grey)] p-4"
  aria-busy={loading}
>
  <legend class="px-2 text-sm font-bold text-[var(--text-mention-grey)]">{label}</legend>
  <div class="grid min-w-0 gap-4 sm:grid-cols-2">
    <div class="min-w-0">
      <label class="fr-label" for={`${id}-demande`}>Demande</label>
      <Select
        id={`${id}-demande`}
        options={demandeOptions}
        bind:value={demandeId}
        onChange={() => {
          revision = "current";
        }}
      />
    </div>
    <div class="min-w-0">
      <label class="fr-label" for={`${id}-state`}>État</label>
      <Select
        id={`${id}-state`}
        options={stateOptions}
        bind:value={revision}
        listPlacement={{ preferredHeight: 360, minWidth: 360 }}
      />
    </div>
  </div>
  {#if loading}<p role="status" class="fr-text--sm fr-mt-1w fr-mb-0">Chargement de l’état…</p>{/if}
  {#if errorMessage}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
</fieldset>
