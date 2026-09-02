import type { NodeViewRenderer } from "@tiptap/core";

/**
 * Attributes shared by the image and video nodes: an optional pixel `width`
 * (set by dragging the resize handle) and an optional `align`, stored as
 * `data-align` so both apps can style it without allowing inline styles on media.
 */
export function mediaSizingAttributes() {
  return {
    width: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("width"),
      renderHTML: (attributes: Record<string, unknown>) =>
        attributes.width ? { width: attributes.width } : {},
    },
    align: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute("data-align"),
      renderHTML: (attributes: Record<string, unknown>) =>
        attributes.align ? { "data-align": attributes.align } : {},
    },
  };
}

const MIN_WIDTH = 80;

/**
 * In-editor rendering of an image/video: an alignment wrapper around the media
 * plus a bottom-right handle that resizes by drag (committing `width` on release).
 */
export function mediaNodeView(tag: "img" | "video"): NodeViewRenderer {
  return ({ node, editor, getPos }) => {
    const dom = document.createElement("div");
    dom.className = "rte-media";
    const box = document.createElement("span");
    box.className = "rte-media-box";
    const media = document.createElement(tag);
    if (media instanceof HTMLVideoElement) {
      media.controls = true;
      media.preload = "metadata";
    }
    box.append(media);
    dom.append(box);

    // One handle per corner; on the left corners the drag direction is inverted.
    const HANDLES = [
      { corner: "nw", sign: -1 },
      { corner: "ne", sign: 1 },
      { corner: "sw", sign: -1 },
      { corner: "se", sign: 1 },
    ] as const;
    for (const { corner, sign } of HANDLES) {
      const handle = document.createElement("span");
      handle.className = `rte-resize-handle rte-handle-${corner}`;
      handle.title = "Redimensionner";
      handle.addEventListener("pointerdown", (event) => startResize(event, sign));
      box.append(handle);
    }

    let current = node;
    function sync() {
      media.setAttribute("src", current.attrs.src ?? "");
      if (media instanceof HTMLImageElement) {
        if (current.attrs.alt) media.setAttribute("alt", current.attrs.alt);
        else media.removeAttribute("alt");
      }
      if (current.attrs.width) media.setAttribute("width", String(current.attrs.width));
      else media.removeAttribute("width");
      if (current.attrs.align) dom.setAttribute("data-align", current.attrs.align);
      else dom.removeAttribute("data-align");
    }
    sync();

    function startResize(event: PointerEvent, sign: 1 | -1) {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = media.getBoundingClientRect().width;
      const maxWidth = Math.round(dom.getBoundingClientRect().width);
      let width = Math.round(startWidth);

      const onMove = (moveEvent: PointerEvent) => {
        const wanted = Math.round(startWidth + sign * (moveEvent.clientX - startX));
        width = Math.min(Math.max(wanted, MIN_WIDTH), maxWidth);
        media.setAttribute("width", String(width));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const position = getPos();
        if (position === undefined) return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(position, undefined, { ...current.attrs, width }),
        );
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }

    return {
      dom,
      update(updated) {
        if (updated.type !== current.type) return false;
        current = updated;
        sync();
        return true;
      },
      // The drag mutates width/data-align in place; ProseMirror must not try to
      // re-parse those DOM changes as edits.
      ignoreMutation: () => true,
    };
  };
}
