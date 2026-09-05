<script lang="ts">
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import type { PieceJointeSimple } from "./piecesJointes.ts";

  type Props = {
    title: string;
    emptyMessage: string;
    tabLabel: string;
    pieces: PieceJointeSimple[];
    openTab: () => void;
  };
  let { title, emptyMessage, tabLabel, pieces, openTab }: Props = $props();

  function name(piece: PieceJointeSimple) {
    return piece.description?.name || piece.label;
  }
  function details(piece: PieceJointeSimple) {
    const values = [];
    if (piece.description?.media_type) values.push(piece.description.media_type);
    if (typeof piece.description?.size === "number")
      values.push(byteFormat.format(piece.description.size));
    if (piece.date) values.push(`${piece.labelDate} : ${formatDateAbsolute(piece.date)}`);
    return values.length ? `${piece.label} - ${values.join(" - ")}` : piece.label;
  }
</script>

<section class="fr-p-0 [&_p:last-child]:mb-0">
  <div
    class="flex items-start justify-between gap-4 fr-mb-3v max-[48rem]:flex-col max-[48rem]:gap-1 [&_h3]:m-0"
  >
    <h3>{title}</h3>
    <button type="button" class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm" onclick={openTab}>
      Voir dans l'onglet {tabLabel}
    </button>
  </div>
  {#if pieces.length === 0}
    <p>{emptyMessage}</p>
  {:else}
    <ul class="flex flex-col gap-2 list-none fr-p-0 fr-m-0">
      {#each pieces as piece}
        <li
          class="flex items-start justify-between gap-3 fr-py-3v fr-px-2w border border-[color:var(--border-default-grey)] rounded-[0.5rem] bg-[var(--background-alt-grey,#f6f6f6)] max-[48rem]:flex-col"
        >
          <div class="min-w-0">
            <a
              class="fr-link fr-link--download"
              href={piece.url}
              title={name(piece)}
              data-sveltekit-reload
            >
              {name(piece)}
              <span class="fr-link__detail">{details(piece)}</span>
            </a>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
