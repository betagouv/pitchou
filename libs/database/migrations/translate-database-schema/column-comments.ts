import { COLUMN_COMMENTS_CHUNK_1 } from "./column-comments-1.ts";
import { COLUMN_COMMENTS_CHUNK_2 } from "./column-comments-2.ts";
import { COLUMN_COMMENTS_CHUNK_3 } from "./column-comments-3.ts";

export const columnComments = {
  ...COLUMN_COMMENTS_CHUNK_1,
  ...COLUMN_COMMENTS_CHUNK_2,
  ...COLUMN_COMMENTS_CHUNK_3,
} as const satisfies Record<string, Record<string, readonly [string, string]>>;
