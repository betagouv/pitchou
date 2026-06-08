<script lang="ts">
  type Props = {
    id: string;
  };

  let { id }: Props = $props();

  const titreId = $derived(`${id}-title`);
</script>

<dialog {id} class="fr-modal" aria-labelledby={titreId}>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
        <div class="fr-modal__body">
          <div class="fr-modal__header">
            <button class="fr-btn--close fr-btn" title="Fermer" aria-controls={id}>Fermer</button>
          </div>
          <div class="fr-modal__content">
            <h1 id={titreId} class="fr-modal__title">Comment cette liste est générée ?</h1>

            <p>
              Cette liste n'est pas saisie à la main : elle est reconstruite en croisant plusieurs
              sources de référence de l'<abbr title="Inventaire National du Patrimoine Naturel"
                >INPN</abbr
              >
              (Muséum national d'Histoire naturelle) avec des listes maintenues par Pitchou. Chaque espèce
              apparaît une seule fois, regroupée par son identifiant
              <strong>CD_REF</strong> de TAXREF ; ses noms et ses statuts y sont fusionnés.
            </p>

            <h2 class="fr-h6 fr-mt-3w">TAXREF — le référentiel taxonomique</h2>
            <p>
              Fournit, pour chaque espèce, son <strong>nom scientifique de référence</strong> et ses
              synonymes (le « +N » à côté du nom), ses <strong>noms vernaculaires</strong>, et sa
              <strong>classification</strong> : oiseau, faune non-oiseau ou flore.
            </p>

            <h2 class="fr-h6 fr-mt-3w">BDC-Statuts — les statuts de protection</h2>
            <p>
              La base de connaissance des statuts de l'INPN fournit les statuts de protection. Nous
              n'en conservons que quatre :
            </p>
            <ul>
              <li><strong>PN</strong> — protection nationale</li>
              <li><strong>PR</strong> — protection régionale</li>
              <li><strong>PD</strong> — protection départementale</li>
              <li><strong>POM</strong> — protection en outre-mer</li>
            </ul>

            <h2 class="fr-h6 fr-mt-3w">Espèces manquantes — complément Pitchou</h2>
            <p>
              Certaines espèces protégées sont absentes de la BDC-Statuts. Nous les ajoutons
              manuellement à partir d'une liste maintenue par Pitchou ; elles portent alors le
              statut <strong>« Protection Pitchou »</strong>.
            </p>

            <h2 class="fr-h6 fr-mt-3w">Listes ministérielle et CNPN — marquage Pitchou</h2>
            <p>
              Deux listes maintenues par Pitchou indiquent les espèces relevant de la liste
              ministérielle ou de la liste <abbr
                title="Conseil National de la Protection de la Nature">CNPN</abbr
              >. Les espèces concernées sont signalées par les badges
              <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">Ministère</span> et
              <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">CNPN</span> à côté de leur nom.
            </p>

            <p class="fr-text--sm fr-mt-3w">
              Les sources INPN évoluant régulièrement, cette liste est régénérée pour les intégrer.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>
