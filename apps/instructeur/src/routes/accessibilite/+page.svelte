<script lang="ts">
  import { onMount } from "svelte";
  import Accessibilite from "$lib/components/screens/Accessibilite.svelte";

  let html = $state("");

  onMount(async () => {
    try {
      const res = await fetch("/declaration-accessibilite_2025-07-07.html", {
        credentials: "same-origin",
      });
      html = await res.text();
    } catch (err) {
      console.error("Erreur chargement déclaration accessibilité", err);
    }
  });
</script>

<Accessibilite title="Accessibilité" {html} />
