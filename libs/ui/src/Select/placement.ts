/** Room the list asks for before it starts scrolling. */
const PREFERRED_HEIGHT = 288;
/** Below that, opening on a side is not worth it — the other side wins. */
const MIN_HEIGHT = 144;
/** Space between the trigger and the list. */
const GAP = 4;
/** Breathing room kept against the viewport edges. */
const VIEWPORT_MARGIN = 8;

export type Placement = {
  left: number;
  width: number;
  maxHeight: number;
  /** Only one is set: the side the list grows from. */
  top?: number;
  bottom?: number;
};

/**
 * Where the list goes, given the trigger's position on screen. It is placed
 * against the viewport rather than the trigger, so neither a scrolling panel
 * nor a modal can clip it. It opens downwards when there is room, upwards
 * otherwise, and shrinks to whatever space is left.
 */
export function computePlacement(rect: DOMRect, viewportHeight: number): Placement {
  const below = viewportHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
  const above = rect.top - GAP - VIEWPORT_MARGIN;
  const dropUp = below < Math.min(PREFERRED_HEIGHT, above) && above > MIN_HEIGHT;
  const available = dropUp ? above : below;

  return {
    left: rect.left,
    width: rect.width,
    maxHeight: Math.max(MIN_HEIGHT, Math.min(PREFERRED_HEIGHT, available)),
    top: dropUp ? undefined : rect.bottom + GAP,
    bottom: dropUp ? viewportHeight - rect.top + GAP : undefined,
  };
}
