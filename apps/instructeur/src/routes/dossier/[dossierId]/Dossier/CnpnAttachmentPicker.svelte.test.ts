import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { page } from "vitest/browser";
import CnpnAttachmentPicker from "./CnpnAttachmentPicker.svelte";
import type { PieceJointeGroup } from "./piecesJointes.ts";
import type File from "@pitchou/types/database/public/File.ts";
import { FRANCE_TRANSFERT_URL } from "@pitchou/common/emailSize.ts";

afterEach(cleanup);

test("warns about oversized encoded attachments even when the picker is collapsed", async () => {
  const fileId = "11111111-1111-4111-8111-111111111111" as File["id"];
  const groups = [
    {
      title: "Projet",
      pieces: [
        {
          fileId,
          label: "Projet",
          labelDate: "Dépôt",
          url: "/piece.pdf",
          description: {
            id: fileId,
            name: "piece.pdf",
            size: 8_700_000,
            media_type: "application/pdf",
            url: "/piece.pdf",
          },
        },
      ],
    },
  ] as PieceJointeGroup[];
  const view = render(CnpnAttachmentPicker, {
    groups,
    selectedIds: [fileId],
    onSelectedIdsChange: vi.fn(),
  });
  await expect.element(page.getByRole("alert")).toMatchTextContent("limite de 10 Mo");
  await expect
    .element(page.getByRole("link", { name: "Ouvrir France Transfert" }))
    .toHaveAttribute("href", FRANCE_TRANSFERT_URL);
  await view.rerender({ selectedIds: [] });
  await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
});
