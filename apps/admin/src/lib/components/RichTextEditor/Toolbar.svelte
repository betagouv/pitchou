<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Editor } from "@tiptap/core";
  import MediaButton from "./MediaButton.svelte";
  import { TOOLBAR_BUTTON_CLASS, toolbarButtonGroups, type Align } from "./toolbarButtons.ts";

  let {
    editor,
    version,
    uploadMedia,
    toolbarEnd,
  }: {
    editor: Editor | undefined;
    /** Bumped by the parent on every transaction so active states recompute. */
    version: number;
    uploadMedia?: (file: File) => Promise<string>;
    toolbarEnd?: Snippet;
  } = $props();

  let uploadError = $state<string | null>(null);

  function isActive(name: string, attributes?: Record<string, unknown>): boolean {
    void version;
    return editor?.isActive(name, attributes) ?? false;
  }

  function toggleLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("URL du lien");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  /** The selected media node ("image"/"video"), or `null` in regular text. */
  function selectedMedia(): "image" | "video" | null {
    if (editor?.isActive("image")) return "image";
    if (editor?.isActive("video")) return "video";
    return null;
  }

  // The same three buttons align text blocks (TextAlign, inline text-align
  // style) and media nodes (`align` attribute, rendered as data-align).
  function setAlign(align: Align) {
    if (!editor) return;
    const media = selectedMedia();
    if (media) {
      editor
        .chain()
        .focus()
        .updateAttributes(media, { align: align === "left" ? null : align })
        .run();
      return;
    }
    editor.chain().focus().setTextAlign(align).run();
  }

  function alignActive(align: Align): boolean {
    void version;
    if (!editor) return false;
    const media = selectedMedia();
    if (media) return (editor.getAttributes(media).align ?? "left") === align;
    return editor.isActive({ textAlign: align });
  }

  const groups = toolbarButtonGroups({
    editor: () => editor,
    isActive,
    canUndo: () => {
      void version;
      return editor?.can().undo() ?? false;
    },
    canRedo: () => {
      void version;
      return editor?.can().redo() ?? false;
    },
    toggleLink,
    setAlign,
    alignActive,
  });
</script>

{#snippet divider()}
  <span class="mx-1 h-6 w-px shrink-0 bg-gray-300" aria-hidden="true"></span>
{/snippet}

<!-- Framed toolbar, sticky right below the admin shell topbar (h-14): its own
     background and border keep it readable while the content scrolls under. -->
<div
  class="sticky top-14 z-10 rounded-t-lg border border-solid border-[var(--border-default-grey)] bg-gray-50 px-2 py-1.5 shadow-sm"
>
  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Mise en forme">
      {#each groups as buttons, groupIndex (groupIndex)}
        {#if groupIndex > 0}
          {@render divider()}
        {/if}
        {#each buttons as button (button.title)}
          <button
            type="button"
            class="{TOOLBAR_BUTTON_CLASS} {button.icon ?? ''} {button.active?.()
              ? 'bg-blue-100'
              : ''}"
            title={button.title}
            aria-pressed={button.active ? button.active() : undefined}
            disabled={button.disabled?.()}
            onclick={button.run}
          >
            {#if button.bars}
              <span
                class="flex w-4 flex-col gap-[3px] {button.bars === 'start'
                  ? 'items-start'
                  : button.bars === 'center'
                    ? 'items-center'
                    : 'items-end'}"
                aria-hidden="true"
              >
                <span class="h-[2px] w-4 rounded-full bg-current"></span>
                <span class="h-[2px] w-2.5 rounded-full bg-current"></span>
                <span class="h-[2px] w-4 rounded-full bg-current"></span>
              </span>
              <span class="sr-only">{button.title}</span>
            {:else if button.text}
              <span class="w-4 text-center font-semibold {button.textClass}" aria-hidden="true">
                {button.text}
              </span>
              <span class="sr-only">{button.title}</span>
            {:else}
              {button.title}
            {/if}
          </button>
        {/each}
      {/each}

      {#if uploadMedia}
        {@render divider()}
        <MediaButton {editor} {uploadMedia} onError={(message) => (uploadError = message)} />
      {/if}
    </div>

    {#if toolbarEnd}
      <div class="shrink-0 pr-2">{@render toolbarEnd()}</div>
    {/if}
  </div>

  {#if uploadError}
    <p class="fr-text--sm fr-error-text fr-mt-1v fr-mb-0" role="alert">
      Échec de l'envoi du média : {uploadError}
    </p>
  {/if}
</div>
