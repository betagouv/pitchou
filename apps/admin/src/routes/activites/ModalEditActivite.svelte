<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import type { SelectEntry, SelectOption } from "@pitchou/ui/Select/options.ts";
  import { activiteIconUrl } from "@pitchou/ui/activites/activiteIcon.ts";
  import Modal from "$lib/components/Modal.svelte";
  import type { ActiviteWithLabels } from "./activitesModel.ts";

  type Props = {
    item: ActiviteWithLabels;
    /** Color of the group the activity belongs to, used behind its icon. */
    color: string;
    activiteEntries: SelectEntry<string>[];
    groupeOptions: SelectOption<string>[];
    onRename: (code: string, label: string) => Promise<void>;
    onReassign: (label: string, activiteCode: string) => Promise<void>;
    onMoveActivite: (code: string, groupeCode: string) => Promise<void>;
    onClose: () => void;
  };

  let {
    item,
    color,
    activiteEntries,
    groupeOptions,
    onRename,
    onReassign,
    onMoveActivite,
    onClose,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let draftLabel = $state(item.activite.label);
  let busy = $state(false);

  /** Serializes the mutations and keeps the controls disabled while one is running. */
  async function run(mutation: () => Promise<void>) {
    busy = true;
    try {
      await mutation();
    } catch {
      // The page displays the error and reloads the referentiel, resetting the controls.
    } finally {
      busy = false;
    }
  }

  const renameDisabled = $derived(
    busy || !draftLabel.trim() || draftLabel.trim() === item.activite.label,
  );
  // The accept column only exists when a row needs it, so the selects otherwise reach the edge.
  const hasFlaggedLabels = $derived(item.labels.some(({ needs_review }) => needs_review));
</script>

<Modal title="Modifier l'activité" size="large" {onClose}>
  <div class="fr-p-3w flex flex-col gap-6">
    <div class="flex items-center gap-3">
      <span
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style="background-color: {color}"
      >
        <img src={activiteIconUrl(item.activite.code)} alt="" class="h-7 w-7" />
      </span>
      <div>
        <p class="!m-0 font-bold">{item.activite.label}</p>
        <p class="!m-0 text-xs text-[color:var(--text-mention-grey)]">{item.activite.code}</p>
      </div>
    </div>

    <form
      onsubmit={(event) => {
        event.preventDefault();
        run(() => onRename(item.activite.code, draftLabel.trim()));
      }}
    >
      <label class="fr-label" for="edit-activite-label">
        Nom de l'activité
        <span class="fr-hint-text">Affiché dans Pitchou, notamment dans les formulaires.</span>
      </label>
      <div class="fr-mt-1w flex items-center gap-2">
        <input
          id="edit-activite-label"
          class="fr-input !mt-0 grow"
          type="text"
          bind:value={draftLabel}
        />
        <button type="submit" class="fr-btn shrink-0" disabled={renameDisabled}>Renommer</button>
      </div>
    </form>

    <div>
      <label class="fr-label" for="edit-activite-groupe">
        Groupe thématique
        <span class="fr-hint-text">Détermine où l'activité est rangée et sa couleur.</span>
      </label>
      <Select
        id="edit-activite-groupe"
        class="fr-mt-1w"
        options={groupeOptions}
        value={item.activite.groupe_code}
        disabled={busy}
        onChange={(groupeCode) => {
          if (groupeCode !== item.activite.groupe_code)
            run(() => onMoveActivite(item.activite.code, groupeCode));
        }}
      />
    </div>

    <div>
      <p class="fr-label !mb-1">
        Libellés Démarches Numériques rattachés
        <span class="fr-hint-text">
          Les dossiers portant l'un de ces libellés sont regroupés sous cette activité. Pour
          rattacher un libellé à une autre activité, choisissez-la dans la liste : le libellé
          disparaîtra alors d'ici. Pour accepter tel quel un libellé « À vérifier », utilisez la
          coche.
        </span>
      </p>
      {#if item.labels.length === 0}
        <p class="!m-0 text-sm italic text-[color:var(--text-mention-grey)]">
          Aucun libellé rattaché pour l'instant.
        </p>
      {:else}
        <ul class="!m-0 flex list-none flex-col gap-2 !p-0">
          {#each item.labels as { label, needs_review }, index (label)}
            <!-- Fixed select and action columns: rows stay aligned whatever the label length. -->
            <li
              class="grid items-center gap-x-3 gap-y-2 rounded border border-[color:var(--border-default-grey)] bg-[var(--background-alt-grey)] p-3 text-sm {hasFlaggedLabels
                ? 'sm:grid-cols-[minmax(0,1fr)_16rem_2.5rem]'
                : 'sm:grid-cols-[minmax(0,1fr)_16rem]'}"
            >
              <span class="flex flex-wrap items-center gap-2">
                {#if needs_review}
                  <span class="fr-badge fr-badge--sm fr-badge--warning shrink-0">À vérifier</span>
                {/if}
                <span>{label}</span>
              </span>
              <Select
                id="edit-activite-label-{index}"
                class="w-full"
                ariaLabel="Activité de rattachement pour « {label} »"
                options={activiteEntries}
                value={item.activite.code}
                disabled={busy}
                listPlacement={{ preferredHeight: 480, minWidth: 480 }}
                onChange={(activiteCode) => {
                  if (activiteCode !== item.activite.code)
                    run(() => onReassign(label, activiteCode));
                }}
              />
              {#if needs_review}
                <!-- Reassigning to the current activity is how a flagged label is accepted. -->
                <button
                  type="button"
                  class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-check-line justify-self-end"
                  disabled={busy}
                  title="Accepter ce rattachement"
                  aria-label="Accepter le rattachement de « {label} » à cette activité"
                  onclick={() => run(() => onReassign(label, item.activite.code))}
                ></button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  {#snippet footer()}
    <button type="button" class="fr-btn fr-btn--secondary ml-auto" onclick={onClose}>Fermer</button>
  {/snippet}
</Modal>
