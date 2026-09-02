import type { Editor } from "@tiptap/core";
// Side-effect import: the ChainedCommands augmentations (toggleBold, undo, …)
// live in the extension packages; tsc never sees the .svelte file that loads them.
import "@tiptap/starter-kit";

export const TOOLBAR_BUTTON_CLASS =
  "fr-btn fr-btn--tertiary-no-outline fr-btn--sm rounded-md transition-colors";

export type Align = "left" | "center" | "right";

export type ToolbarButton = {
  title: string;
  /** DSFR icon class — or `text`/`bars` when the DSFR has no icon for it. */
  icon?: string;
  text?: string;
  textClass?: string;
  /** Alignment glyph drawn as three bars anchored at this side. */
  bars?: "start" | "center" | "end";
  active?: () => boolean;
  disabled?: () => boolean;
  run: () => void;
};

type ToolbarContext = {
  editor: () => Editor | undefined;
  isActive: (name: string, attributes?: Record<string, unknown>) => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  toggleLink: () => void;
  setAlign: (align: Align) => void;
  alignActive: (align: Align) => boolean;
};

/** The formatting buttons, grouped: each group gets a divider before it. */
export function toolbarButtonGroups(context: ToolbarContext): ToolbarButton[][] {
  const { editor, isActive, canUndo, canRedo, toggleLink, setAlign, alignActive } = context;
  const chain = () => editor()?.chain().focus();
  return [
    [
      {
        title: "Annuler",
        icon: "fr-icon-arrow-go-back-line",
        disabled: () => !canUndo(),
        run: () => chain()?.undo().run(),
      },
      {
        title: "Rétablir",
        icon: "fr-icon-arrow-go-forward-line",
        disabled: () => !canRedo(),
        run: () => chain()?.redo().run(),
      },
    ],
    [
      {
        title: "Gras",
        icon: "fr-icon-bold",
        active: () => isActive("bold"),
        run: () => chain()?.toggleBold().run(),
      },
      {
        title: "Italique",
        icon: "fr-icon-italic",
        active: () => isActive("italic"),
        run: () => chain()?.toggleItalic().run(),
      },
      {
        title: "Souligné",
        text: "U",
        textClass: "underline",
        active: () => isActive("underline"),
        run: () => chain()?.toggleUnderline().run(),
      },
      {
        title: "Barré",
        text: "S",
        textClass: "line-through",
        active: () => isActive("strike"),
        run: () => chain()?.toggleStrike().run(),
      },
    ],
    [
      {
        title: "Titre de niveau 2",
        icon: "fr-icon-h-2",
        active: () => isActive("heading", { level: 2 }),
        run: () => chain()?.toggleHeading({ level: 2 }).run(),
      },
      {
        title: "Titre de niveau 3",
        icon: "fr-icon-h-3",
        active: () => isActive("heading", { level: 3 }),
        run: () => chain()?.toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      {
        title: "Liste à puces",
        icon: "fr-icon-list-unordered",
        active: () => isActive("bulletList"),
        run: () => chain()?.toggleBulletList().run(),
      },
      {
        title: "Liste numérotée",
        icon: "fr-icon-list-ordered",
        active: () => isActive("orderedList"),
        run: () => chain()?.toggleOrderedList().run(),
      },
    ],
    [
      {
        title: "Aligner à gauche",
        bars: "start",
        active: () => alignActive("left"),
        run: () => setAlign("left"),
      },
      {
        title: "Centrer",
        bars: "center",
        active: () => alignActive("center"),
        run: () => setAlign("center"),
      },
      {
        title: "Aligner à droite",
        bars: "end",
        active: () => alignActive("right"),
        run: () => setAlign("right"),
      },
    ],
    [
      {
        title: "Citation",
        icon: "fr-icon-quote-line",
        active: () => isActive("blockquote"),
        run: () => chain()?.toggleBlockquote().run(),
      },
      {
        title: "Bloc de code",
        icon: "fr-icon-code-s-slash-line",
        active: () => isActive("codeBlock"),
        run: () => chain()?.toggleCodeBlock().run(),
      },
      {
        title: "Séparateur horizontal",
        icon: "fr-icon-separator",
        run: () => chain()?.setHorizontalRule().run(),
      },
    ],
    [
      {
        title: "Lien",
        icon: "fr-icon-link",
        active: () => isActive("link"),
        run: toggleLink,
      },
    ],
  ];
}
