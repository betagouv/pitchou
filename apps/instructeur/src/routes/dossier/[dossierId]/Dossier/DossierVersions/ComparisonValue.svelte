<script lang="ts">
  import type { ComparisonValue } from "@pitchou/types/demandeComparison.ts";
  let { value }: { value: ComparisonValue } = $props();
  const labels: Record<string, string> = {
    code: "Code",
    name: "Nom",
    department: "Département",
    region: "Région",
    coordinates: "Coordonnées",
    geometry: "Géométrie",
    type: "Type",
    libelle: "Libellé",
    identifiantPitchou: "Référence",
    features: "Zones",
    properties: "Propriétés",
  };
  function text(value: string | number) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value))
      return value.split("-").reverse().join("/");
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T/u.test(value) &&
      Number.isFinite(new Date(value).getTime())
    )
      return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      );
    return value;
  }
</script>

{#snippet render(item: ComparisonValue)}
  {#if item === null}<span class="text-[color:var(--text-mention-grey)]">Non renseigné</span>
  {:else if typeof item === "boolean"}{item ? "Oui" : "Non"}
  {:else if Array.isArray(item)}
    {#if item.length === 0}<span>Aucun</span>{:else}<ul>
        {#each item as child}<li>{@render render(child)}</li>{/each}
      </ul>{/if}
  {:else if typeof item === "object"}
    <dl>
      {#each Object.entries(item) as [key, child]}<div class="fr-mb-1w">
          <dt class="font-bold">{labels[key] ?? key}</dt>
          <dd class="fr-ml-0">{@render render(child)}</dd>
        </div>{/each}
    </dl>
  {:else}<span class="whitespace-pre-wrap break-words">{text(item)}</span>{/if}
{/snippet}

{@render render(value)}
