<script lang="ts">
  import type { IndicatorsAARRI } from "@pitchou/types/API_Pitchou.ts";
  import { AARRI_SERIES } from "./chart.ts";

  type Props = { indicators: IndicatorsAARRI };
  let { indicators }: Props = $props();
  const baseWidth = 80;
  const rows = $derived([
    ...AARRI_SERIES.toReversed().map(({ key, label, color }) => ({
      label,
      value: indicators[key],
      color,
    })),
    {
      label: "Base",
      value: indicators.nombreBaseUtilisateuricePotentielle,
      color: "var(--artwork-minor-blue-ecume)",
    },
  ]);
</script>

<section class="fr-mt-4w">
  <h2>État des lieux</h2>
  <p>Voici le nombre d'utilisateurices de Pitchou pour chaque indicateur AARRI aujourd'hui.</p>
  <div class="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
    {#each rows as row}
      <span>{row.label}</span>
      <div class="flex items-center gap-2">
        <div
          class="h-10"
          style:background={row.color}
          style:width={`${(row.value / indicators.nombreBaseUtilisateuricePotentielle) * baseWidth}%`}
        ></div>
        <span>{row.value}</span>
      </div>
    {/each}
  </div>
</section>
<section class="fr-mt-4w">
  <h2>Notre démarche</h2>
  <h3>Cible d'utilisateurices potentiel.les</h3>
  <p>
    Le nombre de personnes qui instruisent et interviennent dans le cadre de la dérogation espèce
    protégée est fluctuant. On l'estime à 300.
  </p>
  <h3>Acquisition</h3>
  <p>
    Une personne acquise est une personne qui suite à une rencontre (webinaire, mail, échange) s’est
    connectée pour la première fois à pitchou.beta.gouv.fr.
  </p>
  <h3>Activation</h3>
  <p>
    Une personne activée est une personne qui a effectué 5 actions de modifications (principalement
    des modifications de dossier) sur une période de 7 jours.
  </p>
  <h3>Proxy-rétention</h3>
  <p>
    Une personne est comptée si elle a effectué au moins 5 actions de modification dans les 30 jours
    précédents. Elle peut sortir de cet indicateur quand ses actions deviennent trop anciennes.
  </p>
  <h3>Rétention</h3>
  <p>
    Une personne est passée en rétention (on dira qu'elle est régulièrement active) lorsqu'elle a
    fait des actions de modification et de consultation très régulièrement. On le traduit comme suit
    : la personne a renouvelé 5 actions de consultation ou de modification sur 7 jours glissants sur
    les 5 dernières semaines.
  </p>
  <h3>Proxy-impact</h3>
  <p>
    Une personne est comptée dès qu'elle a enregistré au moins un contrôle, quel qu'en soit le
    résultat, dans l'historique AARRI conservé sur environ 50 semaines.
  </p>
  <h3>Impact</h3>
  <p>
    Pitchou vise à avoir un réel impact sur la biodiversité. Cet impact se mesure grâce à la surface
    d'habitat et à la population d'une espèce. À ce niveau, on mesure le nombre d'utilisateurices
    ayant fait au moins un contrôle qui produit un retour à la conformité.
  </p>
</section>
