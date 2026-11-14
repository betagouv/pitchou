<script lang="ts">
  import { page } from "$app/state";
  import { can } from "#lib/access.svelte.ts";
  import type { PageData, ActionData } from "./$types";
  import ReviewOverview from "./ReviewOverview.svelte";
  import CommentWorkspace from "./CommentWorkspace.svelte";
  import DuplicateWorkspace from "./DuplicateWorkspace.svelte";
  import ConfirmedDuplicates from "./ConfirmedDuplicates.svelte";
  import "./workspace.css";
  import "./review.css";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let tab = $derived(page.url.searchParams.get("tab") ?? "accueil");
  let section = $derived(
    tab.startsWith("doublons") ? "doublons" : tab === "textes" ? "textes" : "accueil",
  );
  let writable = $derived(can("admin:onagre:manage"));
  const tabs = [
    { key: "accueil", label: "À examiner", icon: "fr-icon-checkbox-circle-line" },
    { key: "textes", label: "Textes à reprendre", icon: "fr-icon-edit-line" },
    { key: "doublons", label: "Doublons", icon: "fr-icon-folder-2-line" },
  ];
</script>

<svelte:head><title>Migration Onagre · Pitchou</title></svelte:head>
<div class="onagre team-review admin-stack">
  <nav class="review-tabs" aria-label="Migration Onagre">
    {#each tabs as item}
      <a href={`?tab=${item.key}`} aria-current={section === item.key ? "page" : undefined}>
        <span class={item.icon} aria-hidden="true"></span>{item.label}
      </a>
    {/each}
  </nav>
  {#if form?.message}<p role="status" class="fr-alert fr-alert--info">{form.message}</p>{/if}
  {#if section === "textes" && data.commentWorkspace}
    <CommentWorkspace workspace={data.commentWorkspace} {writable} />
  {:else if section === "doublons"}
    <nav class="review-subnav" aria-label="Revue des doublons">
      <a href="?tab=doublons" aria-current={tab === "doublons" ? "page" : undefined}>
        À examiner <span>{data.summary.duplicates.pendingDemandes}</span>
      </a>
      <a href="?tab=doublons-evites" aria-current={tab === "doublons-evites" ? "page" : undefined}>
        Doublons évités <span>{data.summary.confirmed}</span>
      </a>
    </nav>
    {#if tab === "doublons-evites"}
      <ConfirmedDuplicates links={data.confirmedDuplicates} />
    {:else if data.duplicateWorkspace}
      <DuplicateWorkspace workspace={data.duplicateWorkspace} {writable} />
    {/if}
  {:else}
    <ReviewOverview summary={data.summary} />
  {/if}
</div>
