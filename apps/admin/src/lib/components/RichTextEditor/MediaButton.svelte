<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import { portal } from "$lib/portal.ts";
  import { CHANGELOG_MEDIA_ACCEPT } from "./mediaTypes.ts";
  import { TOOLBAR_BUTTON_CLASS } from "./toolbarButtons.ts";

  let {
    editor,
    uploadMedia,
    onError,
  }: {
    editor: Editor | undefined;
    uploadMedia: (file: File) => Promise<string>;
    onError: (message: string | null) => void;
  } = $props();

  let fileInput: HTMLInputElement;
  // The file being uploaded right now; non-null while the waiting overlay shows.
  let progress = $state<{ file: File; index: number; total: number } | null>(null);

  function uploadLabel(file: File): string {
    if (file.type.startsWith("video/")) return "Envoi de la vidéo…";
    if (file.type === "image/gif") return "Envoi du GIF…";
    return "Envoi de l'image…";
  }

  function insert(file: File, url: string) {
    if (!editor) return;
    if (file.type.startsWith("video/")) {
      editor
        .chain()
        .focus()
        .insertContent({ type: "video", attrs: { src: url } })
        .run();
    } else {
      // The file name (sans extension) makes a better-than-nothing alt text.
      const alt = file.name.replace(/\.[^.]+$/, "");
      editor.chain().focus().setImage({ src: url, alt }).run();
    }
  }

  async function onFilesPicked() {
    const files = [...(fileInput.files ?? [])];
    fileInput.value = "";
    if (files.length === 0 || progress) return;
    onError(null);
    try {
      for (const [index, file] of files.entries()) {
        progress = { file, index: index + 1, total: files.length };
        insert(file, await uploadMedia(file));
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      progress = null;
    }
  }
</script>

<input
  bind:this={fileInput}
  type="file"
  accept={CHANGELOG_MEDIA_ACCEPT}
  multiple
  class="hidden"
  onchange={onFilesPicked}
/>
<button
  type="button"
  class="{TOOLBAR_BUTTON_CLASS} fr-icon-image-add-line"
  title="Insérer une image, un GIF ou une vidéo"
  disabled={progress !== null}
  onclick={() => fileInput.click()}
>
  Insérer un média
</button>

<!-- Deliberately not the shared Modal: an upload in progress cannot be
     cancelled, so there is no close button, Escape or overlay click. Portaled
     to <body>: inside the sticky toolbar (a z-10 stacking context) the overlay
     would slide under the shell header and sidebar. -->
{#if progress}
  <div
    use:portal
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.4)]"
    role="alert"
    aria-live="assertive"
  >
    <div class="flex flex-col items-center gap-3 rounded-lg bg-white p-8 shadow-xl">
      <span
        class="fr-icon-refresh-line fr-icon--lg inline-block animate-spin text-[#0a76f6]"
        aria-hidden="true"
      ></span>
      <p class="fr-mb-0 font-medium">{uploadLabel(progress.file)}</p>
      <p class="fr-mb-0 max-w-xs truncate text-sm text-gray-500">
        {progress.file.name}{progress.total > 1 ? ` · ${progress.index} sur ${progress.total}` : ""}
      </p>
    </div>
  </div>
{/if}
