import { StringDecoder } from "node:string_decoder";

// COPY rows use LF. Preserve UTF-8 across chunks and any literal CR inside a row.
export async function* copyLines(stream: AsyncIterable<Buffer>): AsyncGenerator<string> {
  const decoder = new StringDecoder("utf8");
  let pending = "";
  for await (const chunk of stream) {
    pending += decoder.write(chunk);
    let end: number;
    while ((end = pending.indexOf("\n")) !== -1) {
      yield pending.slice(0, end);
      pending = pending.slice(end + 1);
    }
  }
  pending += decoder.end();
  if (pending) yield pending;
}
