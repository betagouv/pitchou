<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";

  // `toolbarEnd` renders at the right end of the toolbar row (e.g. a save status).
  let { html = $bindable(""), toolbarEnd }: { html?: string; toolbarEnd?: Snippet } = $props();

  let element: HTMLDivElement;
  let editor = $state<Editor | undefined>();
  // Bumped on every transaction so the toolbar active states recompute.
  let version = $state(0);

  onMount(() => {
    const instance = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          // The public page renders `titre` as its h1; body headings start at h2.
          heading: { levels: [2, 3] },
          link: { openOnClick: false },
        }),
      ],
      content: html,
      onUpdate: ({ editor }) => {
        html = editor.getHTML();
      },
      onTransaction: () => {
        version++;
      },
    });
    editor = instance;
    return () => instance.destroy();
  });

  function isActive(name: string, attributes?: Record<string, unknown>): boolean {
    void version;
    return editor?.isActive(name, attributes) ?? false;
  }

  function canUndo(): boolean {
    void version;
    return editor?.can().undo() ?? false;
  }

  function canRedo(): boolean {
    void version;
    return editor?.can().redo() ?? false;
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

  const buttonClass = "fr-btn fr-btn--tertiary-no-outline fr-btn--sm rounded-md transition-colors";
</script>

{#snippet divider()}
  <span class="mx-1 h-6 w-px shrink-0 bg-gray-300" aria-hidden="true"></span>
{/snippet}

<!-- The focus ring wraps the whole editor frame (toolbar + content) instead of
     the inner contenteditable, whose native outline is suppressed below. -->
<div
  class="flex min-h-0 flex-1 flex-col rounded-lg focus-within:[outline:2px_solid_#0a76f6] focus-within:[outline-offset:2px]"
>
  <!-- Framed toolbar, sticky right below the admin shell topbar (h-14): its own
       background and border keep it readable while the content scrolls under. -->
  <div
    class="sticky top-14 z-10 flex items-center justify-between gap-4 rounded-t-lg border border-solid border-[var(--border-default-grey)] bg-gray-50 px-2 py-1.5 shadow-sm"
  >
    <div class="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Mise en forme">
      <button
        type="button"
        class="{buttonClass} fr-icon-arrow-go-back-line"
        title="Annuler"
        disabled={!canUndo()}
        onclick={() => editor?.chain().focus().undo().run()}
      >
        Annuler
      </button>
      <button
        type="button"
        class="{buttonClass} fr-icon-arrow-go-forward-line"
        title="Rétablir"
        disabled={!canRedo()}
        onclick={() => editor?.chain().focus().redo().run()}
      >
        Rétablir
      </button>

      {@render divider()}

      <button
        type="button"
        class="{buttonClass} fr-icon-bold {isActive('bold') ? 'bg-blue-100' : ''}"
        title="Gras"
        aria-pressed={isActive("bold")}
        onclick={() => editor?.chain().focus().toggleBold().run()}
      >
        Gras
      </button>
      <button
        type="button"
        class="{buttonClass} fr-icon-italic {isActive('italic') ? 'bg-blue-100' : ''}"
        title="Italique"
        aria-pressed={isActive("italic")}
        onclick={() => editor?.chain().focus().toggleItalic().run()}
      >
        Italique
      </button>

      {@render divider()}

      <button
        type="button"
        class="{buttonClass} fr-icon-h-2 {isActive('heading', { level: 2 }) ? 'bg-blue-100' : ''}"
        title="Titre de niveau 2"
        aria-pressed={isActive("heading", { level: 2 })}
        onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        Titre 2
      </button>
      <button
        type="button"
        class="{buttonClass} fr-icon-h-3 {isActive('heading', { level: 3 }) ? 'bg-blue-100' : ''}"
        title="Titre de niveau 3"
        aria-pressed={isActive("heading", { level: 3 })}
        onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        Titre 3
      </button>

      {@render divider()}

      <button
        type="button"
        class="{buttonClass} fr-icon-list-unordered {isActive('bulletList') ? 'bg-blue-100' : ''}"
        title="Liste à puces"
        aria-pressed={isActive("bulletList")}
        onclick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        Liste à puces
      </button>
      <button
        type="button"
        class="{buttonClass} fr-icon-list-ordered {isActive('orderedList') ? 'bg-blue-100' : ''}"
        title="Liste numérotée"
        aria-pressed={isActive("orderedList")}
        onclick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        Liste numérotée
      </button>

      {@render divider()}

      <button
        type="button"
        class="{buttonClass} fr-icon-link {isActive('link') ? 'bg-blue-100' : ''}"
        title="Lien"
        aria-pressed={isActive("link")}
        onclick={toggleLink}
      >
        Lien
      </button>
    </div>

    {#if toolbarEnd}
      <div class="shrink-0 pr-2">{@render toolbarEnd()}</div>
    {/if}
  </div>

  <!-- White content box attached under the toolbar (shared frame). It grows to
       fill the remaining height and keeps growing with the content. -->
  <div
    bind:this={element}
    class="flex flex-1 flex-col rounded-b-lg border border-t-0 border-solid border-[var(--border-default-grey)] bg-white [&_.tiptap]:min-h-[20rem] [&_.tiptap]:flex-1 [&_.tiptap]:p-4 [&_.tiptap]:outline-none [&_.tiptap:focus]:outline-none [&_.tiptap:focus-visible]:outline-none [&_.tiptap_ul]:list-disc [&_.tiptap_ol]:list-decimal [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:pl-6 [&_.tiptap_a]:underline"
  ></div>
</div>
