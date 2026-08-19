import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

/**
 * Backspace at the very start of a block directly preceded by a horizontal rule
 * deletes the rule. Without this, ProseMirror's default handling around a
 * blockquote ending with an <hr> bounces the cursor's paragraph in and out of
 * the blockquote forever, and the rule can never be deleted with the keyboard.
 */
export const HorizontalRuleBackspace = Extension.create({
  name: "horizontalRuleBackspace",
  // Must win over the default Backspace chain (and ListKeymap's).
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection, doc } = editor.state;
        if (!(selection instanceof TextSelection)) return false;
        const { $cursor } = selection;
        if (!$cursor || $cursor.parentOffset !== 0 || $cursor.depth < 1) return false;

        const $block = doc.resolve($cursor.before());
        const before = $block.nodeBefore;
        if (before?.type.name !== "horizontalRule") return false;

        return editor.commands.deleteRange({
          from: $block.pos - before.nodeSize,
          to: $block.pos,
        });
      },
    };
  },
});
