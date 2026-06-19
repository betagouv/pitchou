<script lang="ts">
  // Imports a shared lib to prove cross-package sharing works from a second app.
  import { retirerAccents } from "@pitchou/common/manipulationStrings.ts";

  const demo = retirerAccents("Dérogation espèces protégées");
</script>

<h1>Pitchou — Admin</h1>
<p>Application admin (squelette).</p>
<p>Shared code check (@pitchou/common): <code>{demo}</code></p>
