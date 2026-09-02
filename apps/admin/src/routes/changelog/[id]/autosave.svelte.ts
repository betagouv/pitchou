export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

type AutosaveOptions<Snapshot> = {
  snapshot: () => Snapshot;
  equals: (a: Snapshot, b: Snapshot) => boolean;
  /** A snapshot that must not be sent yet (e.g. a field still empty). */
  canSave: (snapshot: Snapshot) => boolean;
  save: (snapshot: Snapshot) => Promise<void>;
  delay: number;
};

/**
 * Debounced autosave: `schedule()` on every edit, `flush()` before leaving.
 * A save already on the wire never clobbers the status of a newer edit, and a
 * new edit made during a save gets its own save once the first one lands.
 */
export class Autosave<Snapshot> {
  state = $state<SaveState>("idle");
  error = $state<string | null>(null);
  lastSaved: Snapshot | null = null;

  #options: AutosaveOptions<Snapshot>;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #changeCounter = 0;
  #inFlight = false;

  constructor(options: AutosaveOptions<Snapshot>) {
    this.#options = options;
  }

  isSaved(snapshot: Snapshot): boolean {
    return this.lastSaved !== null && this.#options.equals(this.lastSaved, snapshot);
  }

  /** Call on every edit: (re)schedules a debounced save. */
  schedule(): void {
    this.#changeCounter++;
    this.state = "pending";
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.saveNow(), this.#options.delay);
  }

  async saveNow(): Promise<void> {
    if (this.#inFlight) {
      // A save is already on the wire; try again once it lands.
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => void this.saveNow(), this.#options.delay);
      return;
    }
    const snapshot = this.#options.snapshot();
    if (!this.#options.canSave(snapshot)) return;
    await this.#doSave(snapshot);
  }

  /**
   * Resolves once everything is saved — or a save failed (retrying a failing
   * server in a loop would never resolve). Check `state` afterwards.
   */
  async flush(): Promise<void> {
    clearTimeout(this.#timer);
    while (this.state !== "error") {
      if (this.#inFlight) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }
      const snapshot = this.#options.snapshot();
      if (this.isSaved(snapshot) || !this.#options.canSave(snapshot)) return;
      await this.#doSave(snapshot);
    }
  }

  async #doSave(snapshot: Snapshot): Promise<void> {
    const counter = this.#changeCounter;
    this.state = "saving";
    this.#inFlight = true;
    try {
      await this.#options.save(snapshot);
      this.lastSaved = snapshot;
      // A newer edit already reset the status to "pending": leave it alone.
      if (counter === this.#changeCounter) {
        this.state = "saved";
        this.error = null;
      }
    } catch (e) {
      if (counter === this.#changeCounter) {
        this.state = "error";
        this.error = e instanceof Error ? e.message : String(e);
      }
    } finally {
      this.#inFlight = false;
    }
  }
}
