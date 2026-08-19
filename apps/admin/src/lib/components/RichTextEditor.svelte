<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import TextAlign from "@tiptap/extension-text-align";
  import Toolbar from "./RichTextEditor/Toolbar.svelte";
  import { HorizontalRuleBackspace } from "./RichTextEditor/hrBackspace.ts";
  import { ResizableImage } from "./RichTextEditor/image.ts";
  import { Video } from "./RichTextEditor/video.ts";

  // `toolbarEnd` renders at the right end of the toolbar row (e.g. a save status).
  // `uploadMedia` stores a picked file and returns its URL; without it the
  // editor simply has no media button.
  let {
    html = $bindable(""),
    toolbarEnd,
    uploadMedia,
  }: {
    html?: string;
    toolbarEnd?: Snippet;
    uploadMedia?: (file: File) => Promise<string>;
  } = $props();

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
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right"],
        }),
        ResizableImage,
        Video,
        HorizontalRuleBackspace,
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
</script>

<!-- The focus ring wraps the whole editor frame (toolbar + content) instead of
     the inner contenteditable, whose native outline is suppressed below. -->
<div
  class="flex min-h-0 flex-1 flex-col rounded-lg focus-within:[outline:2px_solid_#0a76f6] focus-within:[outline-offset:2px]"
>
  <Toolbar {editor} {version} {uploadMedia} {toolbarEnd} />

  <!-- White content box attached under the toolbar (shared frame). It grows to
       fill the remaining height and keeps growing with the content. -->
  <div
    bind:this={element}
    class="flex flex-1 flex-col rounded-b-lg border border-t-0 border-solid border-[var(--border-default-grey)] bg-white [&_.tiptap]:min-h-[20rem] [&_.tiptap]:flex-1 [&_.tiptap]:p-4 [&_.tiptap]:outline-none [&_.tiptap:focus]:outline-none [&_.tiptap:focus-visible]:outline-none [&_.tiptap_ul]:list-disc [&_.tiptap_ol]:list-decimal [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:pl-6 [&_.tiptap_a]:underline [&_.tiptap_img]:max-w-full [&_.tiptap_img]:rounded-md [&_.tiptap_video]:max-w-full [&_.tiptap_video]:rounded-md [&_.tiptap_.ProseMirror-selectednode:not(.rte-media)]:[outline:2px_solid_#0a76f6] [&_.tiptap_.ProseMirror-selectednode:not(.rte-media)]:[outline-offset:2px] [&_.tiptap_.ProseMirror-selectednode_.rte-media-box]:[outline:2px_solid_#0a76f6] [&_.tiptap_.ProseMirror-selectednode_.rte-media-box]:[outline-offset:2px] [&_.rte-media[data-align=center]]:text-center [&_.rte-media[data-align=right]]:text-right [&_.rte-media-box]:relative [&_.rte-media-box]:inline-block [&_.rte-media-box]:max-w-full [&_.rte-resize-handle]:absolute [&_.rte-resize-handle]:size-3 [&_.rte-resize-handle]:rounded-full [&_.rte-handle-nw]:-top-1.5 [&_.rte-handle-nw]:-left-1.5 [&_.rte-handle-nw]:cursor-nwse-resize [&_.rte-handle-ne]:-top-1.5 [&_.rte-handle-ne]:-right-1.5 [&_.rte-handle-ne]:cursor-nesw-resize [&_.rte-handle-sw]:-bottom-1.5 [&_.rte-handle-sw]:-left-1.5 [&_.rte-handle-sw]:cursor-nesw-resize [&_.rte-handle-se]:-bottom-1.5 [&_.rte-handle-se]:-right-1.5 [&_.rte-handle-se]:cursor-nwse-resize [&_.rte-resize-handle]:border-2 [&_.rte-resize-handle]:border-solid [&_.rte-resize-handle]:border-white [&_.rte-resize-handle]:bg-[#0a76f6] [&_.rte-resize-handle]:opacity-0 [&_.rte-resize-handle]:transition-opacity [&_.rte-media-box:hover_.rte-resize-handle]:opacity-100 [&_.ProseMirror-selectednode_.rte-resize-handle]:opacity-100 [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-solid [&_.tiptap_blockquote]:border-gray-300 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:text-gray-600 [&_.tiptap_pre]:rounded-md [&_.tiptap_pre]:bg-gray-100 [&_.tiptap_pre]:p-3 [&_.tiptap_pre]:font-mono [&_.tiptap_pre]:text-sm"
  ></div>
</div>
