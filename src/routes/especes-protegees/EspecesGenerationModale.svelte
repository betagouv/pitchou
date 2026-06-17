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

            <h2 class="fr-h6 fr-mt-3w">TAXREF : le référentiel taxonomique</h2>
            <p>
              Fournit, pour chaque espèce, son <strong>nom scientifique de référence</strong> et ses
              synonymes (le « +N » à côté du nom), ses <strong>noms vernaculaires</strong>, et sa
              <strong>classification</strong> : oiseau, faune non-oiseau ou flore.
            </p>
            <p><a href="/taxref">Consulter les données TAXREF</a>.</p>

            <h2 class="fr-h6 fr-mt-3w">BDC-Statuts : les statuts de protection</h2>
            <p>
              La base de connaissance des statuts de l'INPN fournit les statuts de protection. Nous
              n'en conservons que quatre :
            </p>
            <ul>
              <li><strong>PN</strong> : protection nationale</li>
              <li><strong>PR</strong> : protection régionale</li>
              <li><strong>PD</strong> : protection départementale</li>
              <li><strong>POM</strong> : protection en outre-mer</li>
            </ul>
            <p><a href="/bdc-statuts">Consulter les données BDC-Statuts</a>.</p>

            <h2 class="fr-h6 fr-mt-3w">Compléments et corrections de Pitchou</h2>
            <p>
              Par-dessus ces sources, l'équipe Pitchou maintient une couche de corrections
              manuelles. Elle permet de :
            </p>
            <ul>
              <li>
                <strong>ajouter</strong> une espèce protégée absente de la BDC-Statuts ; elle porte
                alors le statut <strong>« Espèce manquante »</strong> ;
              </li>
              <li>
                <strong>corriger</strong> les noms, la classification ou les statuts d'une espèce ;
              </li>
              <li>
                <strong>signaler</strong> les espèces relevant de la liste ministérielle ou de la
                liste
                <abbr title="Conseil National de la Protection de la Nature">CNPN</abbr>, marquées
                par les badges
                <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">Ministère</span> et
                <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">CNPN</span> à côté du nom ;
              </li>
              <li><strong>retirer</strong> une espèce de la liste publique.</li>
            </ul>

            <p class="fr-text--sm fr-mt-3w">
              Les sources INPN évoluant régulièrement, cette liste est régénérée pour les intégrer.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>
