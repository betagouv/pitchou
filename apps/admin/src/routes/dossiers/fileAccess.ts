import { getContext, setContext } from "svelte";

const key = Symbol("dossier-file-access");
type FileAccess = { attachments: () => boolean; species: () => boolean };
export function setFileAccess(access: FileAccess) {
  setContext(key, access);
}
export function getFileAccess(): FileAccess {
  // New dossiers may include files as part of their creation permission.
  return getContext<FileAccess>(key) ?? { attachments: () => true, species: () => true };
}
