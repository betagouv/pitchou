import { mergeAttributes, Node } from "@tiptap/core";

import { mediaNodeView, mediaSizingAttributes } from "./mediaNodeView.ts";

/**
 * Minimal block video node (TipTap ships no official one): a `<video controls>`
 * pointing at an uploaded file, selected/deleted as a single unit, with the
 * same drag-resize and alignment as images.
 */
export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return { src: { default: null }, ...mediaSizingAttributes() };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes, { controls: "true", preload: "metadata" })];
  },

  addNodeView() {
    return mediaNodeView("video");
  },
});
