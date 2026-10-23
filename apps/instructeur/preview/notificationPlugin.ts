import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { previewEnvironment } from "./environment.ts";
import { notificationPage, SEND_NOVELTY_PATH } from "./notificationPage.ts";

export function fleetNotifications(): Plugin {
  return {
    name: "fleet-preview-novelty-emails",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      const preview = previewEnvironment(server.config.root);
      if (!preview) return;
      if (server.config.server.origin !== preview.siteUrl)
        throw new Error("Fleet preview origin does not match the notification tool");
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", preview.siteUrl);
        if (!["/__fleet/accounts", SEND_NOVELTY_PATH].includes(url.pathname)) return next();
        response.setHeader("Cache-Control", "no-store");
        if (
          request.headers.host !== new URL(preview.siteUrl).host &&
          request.headers.host !== `127.0.0.1:${server.config.server.port}`
        ) {
          response.writeHead(403).end();
          return;
        }
        if (url.pathname === "/__fleet/accounts" && request.method === "GET") {
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(notificationPage(preview.accounts, url.searchParams));
          return;
        }
        if (url.pathname !== SEND_NOVELTY_PATH || request.method !== "POST") {
          response
            .writeHead(405, { Allow: url.pathname === SEND_NOVELTY_PATH ? "POST" : "GET" })
            .end();
          return;
        }
        if (
          request.headers.origin !== preview.siteUrl ||
          request.headers["sec-fetch-site"] === "cross-site"
        ) {
          response.writeHead(403).end();
          return;
        }
        const feedback = new URLSearchParams();
        try {
          const module = await server.ssrLoadModule(
            fileURLToPath(new URL("./noveltyEmails.ts", import.meta.url)),
          );
          const result = await module.deliverPreviewNoveltyEmails(preview);
          feedback.set("notifications", result.failed ? "error" : result.sent ? "sent" : "empty");
          feedback.set("sent", String(result.sent));
        } catch (error) {
          console.error(
            "Fleet novelty email test failed",
            error instanceof Error ? error.name : "Error",
          );
          feedback.set("notifications", "error");
        }
        response.writeHead(303, { Location: `/__fleet/accounts?${feedback}` }).end();
      });
    },
  };
}
