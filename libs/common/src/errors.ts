export class HTTPError extends Error {
  status: number;

  constructor(status: number) {
    const message = `Erreur HTTP ${status}`;
    super(message);
    this.name = "HTTPError";
    this.status = status;
  }
}

export class MediaTypeError extends Error {
  expected: string;
  obtained: unknown;

  constructor({ expected, obtained }: { expected: string; obtained: unknown }) {
    const message = `Media-type incorrect. Attendu : ${expected}, obtenu : ${obtained}`;
    super(message);
    this.name = "MediaTypeError";
    this.expected = expected;
    this.obtained = obtained;
  }
}
