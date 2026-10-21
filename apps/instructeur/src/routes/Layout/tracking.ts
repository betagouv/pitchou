type TrackingQueue = { push: (...commands: unknown[][]) => unknown };

/** Tracks navigations through both Matomo's initial queue and its loaded tracker. */
export function createPageViewTracker() {
  let lastTrackedUrl: string | undefined;
  return (queue: TrackingQueue, url: URL, title: string) => {
    const cleaned = new URL(url);
    cleaned.searchParams.delete("secret");
    const trackedUrl = cleaned.toString();
    // The secret-stripping redirect navigates to the same sanitized URL again.
    if (trackedUrl === lastTrackedUrl) return;
    if (lastTrackedUrl) queue.push(["setReferrerUrl", lastTrackedUrl]);
    queue.push(["setCustomUrl", trackedUrl], ["setDocumentTitle", title], ["trackPageView"]);
    lastTrackedUrl = trackedUrl;
  };
}
