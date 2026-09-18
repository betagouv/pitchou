import { describe, expect, it, vi } from "vitest";
import { avisForm, comment, event, mocks, prescriptions } from "./audit.testHelpers.ts";

import { DELETE as deleteControle } from "./controle/[controleId]/+server.ts";
import { DELETE as deletePrescription } from "./prescription/[prescriptionId]/+server.ts";
import {
  POST as addCommentaire,
  PUT as updateCommentaire,
} from "./dossier/[dossierId]/commentaires/+server.ts";
import { POST as updateAvis } from "./avis-expert/+server.ts";
import { DELETE as deleteAvis } from "./avis-expert/[avisExpertId]/+server.ts";
import { DELETE as deleteDecision } from "./decision-administrative/[decisionAdministrativeId]/+server.ts";
import { POST as attachment } from "./attachment-autre/+server.ts";
import { POST as bulk } from "./prescriptions-et-controles/+server.ts";

const databaseRoutes = [
  {
    name: "controle deletion",
    run: () => deleteControle(event()),
    mutation: mocks.deleteControle,
    args: ["controle"],
    status: 204,
  },
  {
    name: "prescription deletion",
    run: () => deletePrescription(event()),
    mutation: mocks.deletePrescription,
    args: ["prescription"],
    status: 204,
  },
  {
    name: "comment creation",
    run: () => addCommentaire(event({ content: comment.content })),
    mutation: mocks.addCommentaire,
    args: ["cap", 42, "Comment"],
    status: 201,
  },
  {
    name: "comment update",
    run: () => updateCommentaire(event(comment)),
    mutation: mocks.updateCommentaire,
    args: ["cap", 42, comment.id, "Comment"],
    status: 204,
  },
  {
    name: "avis update without files",
    run: () => updateAvis(event(avisForm())),
    mutation: mocks.updateAvis,
    args: [expect.objectContaining({ id: "avis", dossier: 42 })],
    status: 204,
  },
  {
    name: "bulk prescriptions and controles",
    run: () => bulk(event(prescriptions)),
    mutation: mocks.bulk,
    args: [prescriptions],
    status: 204,
  },
];

describe.each(databaseRoutes)("$name audit", ({ run, mutation, args, status }) => {
  it("commits the mutation, author lookup, audit and metric on the same connection", async () => {
    const response = await run();
    expect(response.status).toBe(status);
    if (status === 201) expect(await response.json()).toEqual(comment);
    expect(mutation).toHaveBeenCalledWith(...args, mocks.transaction);
    expect(mocks.author).toHaveBeenCalledWith("cap", mocks.transaction);
    expect(mocks.transaction.mock.calls).toEqual([["action_dossier"], ["evenement_metrique"]]);
    expect(mocks.database).not.toHaveBeenCalled();
    expect(mocks.commit).toHaveBeenCalledOnce();
    expect(mocks.rollback).not.toHaveBeenCalled();
  });

  it.each(["author", "audit", "metric"])("rolls back on %s failure", async (stage) => {
    const failure = new Error(`${stage} failed`);
    if (stage === "author") mocks.author.mockRejectedValueOnce(failure);
    else if (stage === "audit") mocks.insert.mockRejectedValueOnce(failure);
    else mocks.insert.mockResolvedValueOnce(undefined).mockRejectedValueOnce(failure);
    await expect(run()).rejects.toBeDefined();
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.rollback).toHaveBeenCalledOnce();
  });

  it("rejects unauthorized access before mutating or auditing", async () => {
    mocks.access.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(run()).rejects.toThrow("Forbidden");
    expect(mutation).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

it("does not audit a comment update rejected by the ownership check", async () => {
  mocks.updateCommentaire.mockResolvedValueOnce(false);
  await expect(updateCommentaire(event(comment))).rejects.toMatchObject({ status: 403 });
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.rollback).toHaveBeenCalledOnce();
});

it("does not audit a failed bulk insert", async () => {
  mocks.bulk.mockRejectedValueOnce(new Error("Invalid controle"));
  await expect(bulk(event(prescriptions))).rejects.toMatchObject({ status: 400 });
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.rollback).toHaveBeenCalledOnce();
});

const fileRoutes = [
  { name: "avis upload", run: () => updateAvis(event(avisForm(true))), mutation: mocks.uploadAvis },
  { name: "avis deletion", run: () => deleteAvis(event()), mutation: mocks.deleteAvis },
  { name: "decision deletion", run: () => deleteDecision(event()), mutation: mocks.deleteDecision },
  {
    name: "attachment upload",
    run: () => {
      const form = new FormData();
      form.set("dossier", "42");
      form.set("type", "Autre");
      form.set("files", new File(["attachment"], "attachment.pdf"));
      return attachment(event(form));
    },
    mutation: mocks.attachment,
  },
];

describe.each(fileRoutes)("$name audit", ({ run, mutation }) => {
  it.each(["author", "synchronous author", "audit"])(
    "preserves success after %s failure",
    async (stage) => {
      const failure = new Error(`${stage} failed`);
      if (stage === "author") mocks.author.mockRejectedValueOnce(failure);
      else if (stage === "synchronous author")
        mocks.author.mockImplementationOnce(() => {
          throw failure;
        });
      else mocks.insert.mockRejectedValueOnce(failure);
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const response = await run();
        expect(response.ok).toBe(true);
        if (mutation === mocks.attachment) expect(await response.json()).toEqual(["attachment-id"]);
        expect(mutation).toHaveBeenCalledOnce();
        expect(consoleError).toHaveBeenCalledWith(expect.any(String), expect.any(Array), failure);
      } finally {
        consoleError.mockRestore();
      }
    },
  );

  it("rejects unauthorized access before touching files", async () => {
    mocks.access.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(run()).rejects.toThrow("Forbidden");
    expect(mutation).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
