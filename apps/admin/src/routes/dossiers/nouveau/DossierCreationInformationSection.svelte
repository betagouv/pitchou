<script lang="ts">
  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model, showTopBorder = true }: { model: DossierCreationModel; showTopBorder?: boolean } =
    $props();
</script>

<section
  class={`fr-pt-4w ${showTopBorder ? "border-t border-[color:var(--border-default-grey)]" : ""}`}
  aria-labelledby="information-title"
>
  <h2 class="fr-h2" id="information-title">1. Information à consulter avant de démarrer</h2>

  <div class="fr-callout fr-icon-information-line">
    <h3 class="fr-callout__title">
      Comment savoir si votre projet nécessite une demande de dérogation ?
    </h3>
    <ol class="fr-mb-0">
      <li>
        Vous devez disposer d'un état écologique complet sur l'emprise de votre projet et dans son
        aire d'influence, vous permettant d'identifier précisément les enjeux écologiques présents.
      </li>
      <li>
        Vous devez caractériser les impacts bruts de votre projet sur les individus et habitats
        d'espèces protégées.
      </li>
      <li>
        Vous devez définir les mesures d'évitement et de réduction à mettre en œuvre afin de réduire
        ces impacts bruts et en déduire une caractérisation des impacts résiduels.
      </li>
    </ol>
    <p class="fr-mb-1w fr-ml-3w">
      <strong>3.a Si ces impacts résiduels représentent un risque suffisamment caractérisé</strong>
      pour les espèces protégées ou leurs habitats, un dossier de demande de dérogation est nécessaire
      et vous pouvez le déposer sur cette plateforme.
    </p>
    <p class="fr-mb-0 fr-ml-3w">
      <strong>3.b Si ce risque n'est pas suffisamment caractérisé</strong>, une dérogation n'est pas
      nécessaire. Afin d'obtenir un avis réglementaire sur l'efficacité de vos mesures d'évitement
      et de réduction et la non-nécessité de dérogation, vous pouvez malgré tout déposer votre
      projet via cette plateforme.
    </p>
  </div>

  <div class="fr-input-group max-w-2xl">
    <label class="fr-label" for="urgent-contact-phone">
      Numéro de téléphone en cas de demande urgente relative au dossier
      <span class="fr-hint-text"
        >Format attendu : un numéro de téléphone valide. Exemple : 0612345678</span
      >
    </label>
    <input
      class="fr-input"
      id="urgent-contact-phone"
      type="tel"
      autocomplete="tel"
      pattern={"[0-9+(). -]{10,20}"}
      required
      bind:value={model.urgentContactPhone}
    />
  </div>
</section>
