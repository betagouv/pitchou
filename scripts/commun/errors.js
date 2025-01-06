
export class HTTPError extends Error {
    /**
     * @param {number} status
     */
    constructor(status) {
        const message = `Erreur HTTP ${status}`
        super(message);
        this.name = "HTTPError";
        this.status = status
    }
}

export class MediaTypeError extends Error {
    /**
     * @param {{attendu: string, obtenu: any}} _
     */
    constructor({attendu, obtenu}) {
        const message = `Media-type incorrect. Attendu : ${attendu}, obtenu : ${obtenu}`
        super(message);
        this.name = "MediaTypeError";
        this.attendu = attendu;
        this.obtenu = obtenu;
    }
}


