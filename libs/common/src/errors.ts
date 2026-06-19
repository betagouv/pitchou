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
  attendu: string;
  obtenu: unknown;

  constructor({ attendu, obtenu }: { attendu: string; obtenu: unknown }) {
    const message = `Media-type incorrect. Attendu : ${attendu}, obtenu : ${obtenu}`;
    super(message);
    this.name = "MediaTypeError";
    this.attendu = attendu;
    this.obtenu = obtenu;
  }
}
