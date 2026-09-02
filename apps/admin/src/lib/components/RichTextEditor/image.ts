import Image from "@tiptap/extension-image";

import { mediaNodeView, mediaSizingAttributes } from "./mediaNodeView.ts";

/** Image with drag-resize (`width`) and alignment (`data-align`). */
export const ResizableImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), ...mediaSizingAttributes() };
  },

  addNodeView() {
    return mediaNodeView("img");
  },
});
