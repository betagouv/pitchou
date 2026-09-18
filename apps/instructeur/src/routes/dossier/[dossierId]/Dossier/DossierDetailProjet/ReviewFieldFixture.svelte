<script lang="ts">
  import { setContext } from "svelte";
  import ProjectField from "./ProjectField.svelte";
  import {
    dossierReviewContext,
    registerReviewSnapshot,
  } from "$lib/dossier/notification/snapshot.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { FieldChange } from "@pitchou/types/notification.ts";
  let {
    dossierId,
    label,
    value,
    change,
  }: { dossierId: DossierFull["id"]; label: string; value: unknown; change: FieldChange } =
    $props();
  const dossier = $derived.by(() => {
    const snapshot = {
      id: dossierId,
      description: value,
      access: "complet",
      notificationSnapshot: {
        dossier: dossierId,
        viewed: false,
        updated_at: change.detected_at,
        viewed_at: null,
        new_arrival: null,
        new_follow: null,
        changes: [change],
      },
    } as DossierFull;
    registerReviewSnapshot(snapshot);
    return snapshot;
  });
  setContext(dossierReviewContext, () => dossier);
</script>

<ProjectField {dossierId} {label} value={dossier.description} {change} />
