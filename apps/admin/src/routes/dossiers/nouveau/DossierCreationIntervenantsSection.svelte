<script lang="ts">
  import {
    showsCompensatedNidsCount,
    showsOperationDetails,
    type DossierCreationModel,
  } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();
  let cvError = $state("");

  function addIntervenant() {
    model.scientifiqueIntervenants = [
      ...model.scientifiqueIntervenants,
      { nom_complet: "", qualification: "", cvFiles: [] },
    ];
  }

  function removeIntervenant(index: number) {
    model.scientifiqueIntervenants = model.scientifiqueIntervenants.filter(
      (_, current) => current !== index,
    );
  }

  function setCvFiles(index: number, files: File[]) {
    const otherFilesSize = model.scientifiqueIntervenants.reduce(
      (total, intervenant, current) =>
        current === index
          ? total
          : total + intervenant.cvFiles.reduce((sum, file) => sum + file.size, 0),
      0,
    );
    if (otherFilesSize + files.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
      cvError = "La taille totale des CV ne doit pas dépasser 65 Mo.";
      return;
    }
    cvError = "";
    model.scientifiqueIntervenants[index].cvFiles = files;
  }
</script>

{#if showsOperationDetails(model)}
  <section
    class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
    aria-labelledby="intervenants-title"
  >
    <h3 class="fr-h3" id="intervenants-title">8.4. Personnes amenées à intervenir</h3>
    <h4 class="fr-h4">Qualification des intervenants</h4>

    <div class="flex flex-col gap-4">
      {#each model.scientifiqueIntervenants as intervenant, index (index)}
        <details class="border border-[color:var(--border-default-grey)]" open>
          <summary
            class="fr-p-3w bg-[var(--background-contrast-blue-france)] text-[color:var(--text-action-high-blue-france)] cursor-pointer"
          >
            [{index + 1}] Qualification des intervenants
          </summary>
          <div class="fr-p-3w">
            <div class="fr-input-group w-full fr-mb-3w">
              <label class="fr-label" for={`intervenant-name-${index}`}>Nom Prénom</label>
              <input
                class="fr-input"
                id={`intervenant-name-${index}`}
                bind:value={intervenant.nom_complet}
              />
            </div>
            <div class="fr-input-group w-full fr-mb-3w">
              <label class="fr-label" for={`intervenant-qualification-${index}`}
                >Qualification</label
              >
              <input
                class="fr-input"
                id={`intervenant-qualification-${index}`}
                bind:value={intervenant.qualification}
              />
            </div>
            <div class="fr-upload-group">
              <label class="fr-label" for={`intervenant-cv-${index}`}
                >CV<span class="fr-hint-text"
                  >Taille totale maximale : 65 Mo. Plusieurs fichiers possibles</span
                ></label
              >
              <div
                class="border-2 border-dashed border-[color:var(--border-default-grey)] fr-p-4w text-center"
                role="group"
                aria-label={`Déposer les CV de l'intervenant ${index + 1}`}
                ondragover={(event) => event.preventDefault()}
                ondrop={(event) => {
                  event.preventDefault();
                  if (event.dataTransfer) setCvFiles(index, [...event.dataTransfer.files]);
                }}
              >
                <span class="fr-icon-upload-line fr-icon--lg" aria-hidden="true"></span>
                <p class="fr-mb-2w">Faites glisser et déposez vos fichiers ici</p>
                <span class="fr-mx-2w">OU</span>
                <button
                  class="fr-btn fr-btn--secondary"
                  type="button"
                  onclick={() => document.getElementById(`intervenant-cv-${index}`)?.click()}
                  >Choisir des fichiers</button
                >
                <input
                  class="fr-sr-only"
                  id={`intervenant-cv-${index}`}
                  type="file"
                  multiple
                  onchange={(event) => setCvFiles(index, [...(event.currentTarget.files ?? [])])}
                />
              </div>
              {#if intervenant.cvFiles.length >= 1}
                <ul class="fr-mt-2w">
                  {#each intervenant.cvFiles as file (file.name)}<li>{file.name}</li>{/each}
                </ul>
              {/if}
            </div>
            <div class="flex justify-end fr-mt-3w">
              <button
                type="button"
                class="fr-btn fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
                onclick={() => removeIntervenant(index)}
                >Supprimer [{index + 1}] Qualification des intervenants</button
              >
            </div>
          </div>
        </details>
      {/each}
    </div>
    {#if cvError}<p class="fr-error-text" role="alert">{cvError}</p>{/if}
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-icon-add-circle-line fr-btn--icon-left fr-mt-3w"
      onclick={addIntervenant}>Ajouter un élément à « Qualification des intervenants »</button
    >

    <div class="fr-input-group w-full fr-mt-5w">
      <label class="fr-label" for="scientific-other-intervenants"
        >Apporter des précisions complémentaires sur la possible intervention de
        stagiaire(s)/vacataire(s)/bénévole(s)</label
      >
      <textarea
        class="fr-input"
        id="scientific-other-intervenants"
        rows="5"
        bind:value={model.scientifiqueOtherIntervenantsDetails}></textarea>
    </div>
  </section>
{/if}

{#if showsCompensatedNidsCount(model)}
  <div class="fr-input-group max-w-xl fr-mt-5w">
    <label class="fr-label" for="compensated-nids-count"
      >Indiquer le nombre de nids artificiels posés en compensation *<span class="fr-hint-text"
        >Ce nombre doit être positif.</span
      ></label
    >
    <input
      class="fr-input"
      id="compensated-nids-count"
      type="number"
      min="1"
      step="1"
      required
      bind:value={model.compensatedNidsCount}
    />
  </div>
{/if}
