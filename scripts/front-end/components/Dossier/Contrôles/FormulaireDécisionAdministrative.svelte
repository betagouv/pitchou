<script lang="ts">
  import DateInput from "../../common/DateInput.svelte";

  import toJSONPerserveDate from "../../../../commun/DateToJSON.js";
  import { typesDécisionAdministrative } from "../../../../commun/décision-administrative.js";

  import type { Snippet } from "svelte";
  import type { DécisionAdministrativePourTransfer } from "../../../../types/API_Pitchou.js";

  type Props = {
    décisionAdministrative: DécisionAdministrativePourTransfer;
    onValider: (décision: DécisionAdministrativePourTransfer) => any;
    boutonValider: Snippet;
    boutonAnnuler?: Snippet;
    boutonSupprimer?: Snippet;
  };

  let { décisionAdministrative, onValider, boutonValider, boutonAnnuler, boutonSupprimer }: Props =
    $props();

  let fichiers: FileList | undefined = $state();

  async function formSubmit(e: Event) {
    //console.log('submit', fichiers)
    e.preventDefault();

    if (décisionAdministrative.date_signature) {
      Object.defineProperty(décisionAdministrative.date_signature, "toJSON", {
        value: toJSONPerserveDate,
      });
    }
    if (décisionAdministrative.date_fin_obligations) {
      Object.defineProperty(décisionAdministrative.date_fin_obligations, "toJSON", {
        value: toJSONPerserveDate,
      });
    }

    if (fichiers && fichiers.length >= 1) {
      const fichier = fichiers[0];

      const nom = fichier.name;
      const media_type = fichier.type;

      const contenuBase64P = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener(
          "load",
          () => {
            resolve(reader.result as string);
          },
          false,
        );
        reader.addEventListener("error", reject);
        reader.readAsDataURL(fichier);
      });

      let contenuBase64 = await contenuBase64P;

      // retirer le prefix de la dataURL pour ne garder que le contenu en base64
      const dataURLPrefix = `data:${media_type};base64,`;
      contenuBase64 = contenuBase64.slice(dataURLPrefix.length);

      décisionAdministrative.fichier_base64 = {
        nom,
        media_type,
        contenuBase64,
      };
    }

    onValider(décisionAdministrative);
  }
</script>

<form onsubmit={formSubmit}>
  <div class="fr-upload-group">
    <label class="fr-label" for="upload-fichier-décision"
      >Fichier de la décision administrative
      <span class="fr-hint-text"
        >Indication : Taille maximale&nbsp;: 15 Mo. Formats supportés&nbsp;: pdf</span
      >
    </label>
    <input
      accept=".pdf"
      bind:files={fichiers}
      class="fr-upload"
      aria-describedby="upload-fichier-décision-messages"
      type="file"
      id="upload-fichier-décision"
      name="upload"
    />
    <div class="fr-messages-group" id="upload-fichier-décision-messages" aria-live="polite"></div>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-numéro"> Numéro </label>
    <input
      class="fr-input"
      bind:value={décisionAdministrative.numéro}
      aria-describedby="input-numéro-messages"
      id="input-numéro"
      type="text"
    />
    <div class="fr-messages-group" id="input-numéro-messages" aria-live="polite"></div>
  </div>

  <div class="fr-select-group">
    <label class="fr-label" for="select-type"> Type de décision </label>
    <select
      bind:value={décisionAdministrative.type}
      class="fr-select"
      aria-describedby="select-type-messages"
      id="select-type"
      name="select-type"
    >
      <option value="" selected disabled>Sélectionnez une option</option>
      {#each typesDécisionAdministrative as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
    <div class="fr-messages-group" id="select-type-messages" aria-live="polite"></div>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-numéro">
      Date de signature de la décision administrative
    </label>
    <DateInput bind:date={décisionAdministrative.date_signature}></DateInput>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-numéro"> Date de fin des obligations </label>
    <DateInput bind:date={décisionAdministrative.date_fin_obligations}></DateInput>
  </div>

  <div class="fr-mb-6w">
    {#if boutonValider}
      {@render boutonValider()}
    {:else}
      <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
        Enregistrer
      </button>
    {/if}

    {@render boutonAnnuler?.()}
  </div>

  {#if boutonSupprimer}
    <div>
      {@render boutonSupprimer()}
    </div>
  {/if}
</form>

<style lang="scss">
  form {
    margin-top: 1rem;
    margin-bottom: 2rem;
  }
</style>
