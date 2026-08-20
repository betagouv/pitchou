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

export type PlacementPreferences = {
  /** Room the list asks for before it starts scrolling, instead of the default. */
  preferredHeight?: number;
  /** Widens the list beyond the trigger, as far as the viewport allows. */
  minWidth?: number;
};

/**
 * Where the list goes, given the trigger's position on screen. It is placed
 * against the viewport rather than the trigger, so neither a scrolling panel
 * nor a modal can clip it. It opens downwards when there is room, upwards
 * otherwise, and shrinks to whatever space is left.
 */
export function computePlacement(
  rect: DOMRect,
  viewportHeight: number,
  viewportWidth: number,
  { preferredHeight = PREFERRED_HEIGHT, minWidth = 0 }: PlacementPreferences = {},
): Placement {
  const below = viewportHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
  const above = rect.top - GAP - VIEWPORT_MARGIN;
  const dropUp = below < Math.min(preferredHeight, above) && above > MIN_HEIGHT;
  const available = dropUp ? above : below;

  const width = Math.min(Math.max(rect.width, minWidth), viewportWidth - 2 * VIEWPORT_MARGIN);
  // A widened list is nudged left so it never overflows the viewport.
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rect.left, viewportWidth - VIEWPORT_MARGIN - width),
  );

  return {
    left,
    width,
    maxHeight: Math.max(MIN_HEIGHT, Math.min(preferredHeight, available)),
    top: dropUp ? undefined : rect.bottom + GAP,
    bottom: dropUp ? viewportHeight - rect.top + GAP : undefined,
  };
}
