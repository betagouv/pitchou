<script lang="ts">
  import { onMount } from "svelte";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import { TableKit } from "@tiptap/extension-table";
  import TextAlign from "@tiptap/extension-text-align";
  import EmailToolbarIcon from "./EmailToolbarIcon.svelte";
  let { html = $bindable("") }: { html?: string } = $props();
  let element: HTMLDivElement;
  let editor = $state.raw<Editor>();
  let version = $state(0);
  let lastAppliedHtml = html;
  onMount(() => {
    const instance = new Editor({
      element,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }),
        TableKit.configure({
          table: {
            HTMLAttributes: { border: "1", cellpadding: "6", cellspacing: "0", width: "100%" },
          },
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
      ],
      content: html,
      onUpdate: ({ editor }) => {
        lastAppliedHtml = editor.getHTML();
        html = lastAppliedHtml;
      },
      onTransaction: () => version++,
    });
    editor = instance;
    return () => instance.destroy();
  });
  $effect(() => {
    if (editor && html !== lastAppliedHtml) {
      lastAppliedHtml = html;
      editor.commands.setContent(html, { emitUpdate: false });
    }
  });
  function active(name: string, attributes?: Record<string, unknown>) {
    void version;
    return editor?.isActive(name, attributes) ?? false;
  }
  function alignmentActive(alignment: "left" | "center" | "right" | "justify") {
    void version;
    return editor?.isActive({ textAlign: alignment }) ?? false;
  }
  function can(action: "undo" | "redo") {
    void version;
    return editor?.can()[action]() ?? false;
  }
  const buttonClass =
    "fr-btn fr-btn--sm fr-btn--tertiary-no-outline min-w-8 justify-center px-2 disabled:opacity-50";
  const activeButtonClass =
    "bg-[var(--background-active-blue-france)] text-[color:var(--text-inverted-blue-france)]";
  const alignments = [
    { value: "left", label: "Aligner à gauche" },
    { value: "center", label: "Centrer" },
    { value: "right", label: "Aligner à droite" },
    { value: "justify", label: "Justifier" },
  ] as const;
</script>

<div class="rounded-lg focus-within:[outline:2px_solid_#0a76f6] focus-within:[outline-offset:2px]">
  <div
    class="flex flex-wrap items-center gap-1 rounded-t-lg border border-solid border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] fr-p-1w"
    role="toolbar"
    aria-label="Mise en forme du mail"
  >
    <button
      type="button"
      class="{buttonClass} {active('bold') ? activeButtonClass : ''}"
      title="Gras"
      aria-label="Gras"
      aria-pressed={active("bold")}
      onclick={() => editor?.chain().focus().toggleBold().run()}
      ><EmailToolbarIcon name="bold" /></button
    >
    <button
      type="button"
      class="{buttonClass} {active('italic') ? activeButtonClass : ''}"
      title="Italique"
      aria-label="Italique"
      aria-pressed={active("italic")}
      onclick={() => editor?.chain().focus().toggleItalic().run()}
      ><EmailToolbarIcon name="italic" /></button
    >
    <button
      type="button"
      class="{buttonClass} {active('underline') ? activeButtonClass : ''}"
      title="Souligné"
      aria-label="Souligné"
      aria-pressed={active("underline")}
      onclick={() => editor?.chain().focus().toggleUnderline().run()}
      ><EmailToolbarIcon name="underline" /></button
    >
    <button
      type="button"
      class="{buttonClass} {active('strike') ? activeButtonClass : ''}"
      title="Barré"
      aria-label="Barré"
      aria-pressed={active("strike")}
      onclick={() => editor?.chain().focus().toggleStrike().run()}
      ><EmailToolbarIcon name="strike" /></button
    >
    <span class="mx-1 h-6 w-px bg-[var(--border-default-grey)]" aria-hidden="true"></span>
    <button
      type="button"
      class="{buttonClass} fr-icon-h-2 {active('heading', { level: 2 }) ? activeButtonClass : ''}"
      title="Titre"
      aria-label="Titre"
      aria-pressed={active("heading", { level: 2 })}
      onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
    ></button>
    <button
      type="button"
      class="{buttonClass} fr-icon-list-unordered {active('bulletList') ? activeButtonClass : ''}"
      title="Liste à puces"
      aria-label="Liste à puces"
      aria-pressed={active("bulletList")}
      onclick={() => editor?.chain().focus().toggleBulletList().run()}
    ></button>
    <button
      type="button"
      class="{buttonClass} fr-icon-list-ordered {active('orderedList') ? activeButtonClass : ''}"
      title="Liste numérotée"
      aria-label="Liste numérotée"
      aria-pressed={active("orderedList")}
      onclick={() => editor?.chain().focus().toggleOrderedList().run()}
    ></button>
    <button
      type="button"
      class="{buttonClass} fr-icon-quote-line {active('blockquote') ? activeButtonClass : ''}"
      title="Citation"
      aria-label="Citation"
      aria-pressed={active("blockquote")}
      onclick={() => editor?.chain().focus().toggleBlockquote().run()}
    ></button>
    <span class="mx-1 h-6 w-px bg-[var(--border-default-grey)]" aria-hidden="true"></span>
    {#each alignments as { value, label }}
      <button
        type="button"
        class="{buttonClass} {alignmentActive(value) ? activeButtonClass : ''}"
        title={label}
        aria-label={label}
        aria-pressed={alignmentActive(value)}
        onclick={() => editor?.chain().focus().setTextAlign(value).run()}
        ><EmailToolbarIcon name={`align-${value}`} /></button
      >
    {/each}
    <span class="mx-1 h-6 w-px bg-[var(--border-default-grey)]" aria-hidden="true"></span>
    <button
      type="button"
      class={buttonClass}
      title="Effacer la mise en forme"
      aria-label="Effacer la mise en forme"
      onclick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
      ><EmailToolbarIcon name="clear" /></button
    >
    <span class="ml-auto flex gap-1">
      <button
        type="button"
        class="{buttonClass} fr-icon-arrow-go-back-line"
        title="Annuler"
        aria-label="Annuler"
        disabled={!can("undo")}
        onclick={() => editor?.chain().focus().undo().run()}
      ></button>
      <button
        type="button"
        class="{buttonClass} fr-icon-arrow-go-forward-line"
        title="Rétablir"
        aria-label="Rétablir"
        disabled={!can("redo")}
        onclick={() => editor?.chain().focus().redo().run()}
      ></button>
    </span>
  </div>
  <div
    bind:this={element}
    class="rounded-b-lg border border-t-0 border-solid border-[var(--border-default-grey)] bg-white [&_.tiptap]:min-h-[16rem] [&_.tiptap]:p-4 [&_.tiptap]:text-[0.9375rem] [&_.tiptap]:leading-6 [&_.tiptap]:outline-none [&_.tiptap_ul]:list-disc [&_.tiptap_ol]:list-decimal [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:pl-6 [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-solid [&_.tiptap_blockquote]:border-gray-300 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_table]:w-full [&_.tiptap_table]:border-collapse [&_.tiptap_table]:fr-my-2w [&_.tiptap_th]:border [&_.tiptap_th]:border-solid [&_.tiptap_th]:border-[var(--border-default-grey)] [&_.tiptap_th]:bg-[var(--background-alt-grey)] [&_.tiptap_th]:px-3 [&_.tiptap_th]:py-2 [&_.tiptap_td]:border [&_.tiptap_td]:border-solid [&_.tiptap_td]:border-[var(--border-default-grey)] [&_.tiptap_td]:px-3 [&_.tiptap_td]:py-2"
  ></div>
</div>
