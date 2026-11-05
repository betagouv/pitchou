<script lang="ts">
  import type { OnagreService } from "@pitchou/types/onagreServices.ts";
  let { service, snapshotId }: { service: OnagreService; snapshotId: number } = $props();
</script>

<aside class="service-source">
  <span class="onagre-context">ONAGRE · SERVICE #{service.id}</span>
  <h2>{service.name}</h2>
  <dl>
    <dt>Région</dt>
    <dd>{service.region}</dd>
    <dt>Fin de service</dt>
    <dd>{service.endDate ?? "Non renseignée"}</dd>
    <dt>Visibilité dans Onagre</dt>
    <dd>{service.hidden ? "Masqué" : "Visible"}</dd>
  </dl>
  <a href={`?tab=dump&snapshot=${snapshotId}&table=services&column=servicesid&search=${service.id}`}
    >Explorer le service dans le dump</a
  >
  {#if service.needsReview}<p role="status" class="service-warning">
      Le service ou un groupe cible a changé depuis la dernière décision. Vérifiez la
      correspondance.
    </p>{/if}
  {#if service.absent}<p>
      Ce service est absent du dump sélectionné. Sa décision reste conservée et consultable.
    </p>{/if}
  <p class="onagre-context">
    La correspondance suit l'identifiant du service et reste conservée au prochain dump.
  </p>
</aside>
