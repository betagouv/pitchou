import { createHash } from "node:crypto";
import swaggerBundle from "swagger-ui-dist/swagger-ui-bundle.js?url";
import swaggerStyles from "swagger-ui-dist/swagger-ui.css?url";

export const GET = () => {
  const interactive =
    process.env.NODE_ENV === "development" ||
    (process.env.PUBLIC_PITCHOU_ENV === "staging" &&
      process.env.EXTERNAL_API_SWAGGER_TRY_IT_OUT === "true");
  const init = `SwaggerUIBundle({
    url: "/api/v1/openapi.json",
    dom_id: "#swagger-ui",
    supportedSubmitMethods: ${interactive ? '["get"]' : "[]"},
    validatorUrl: null,
    persistAuthorization: false
  });`;
  const hash = createHash("sha256").update(init).digest("base64");

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pitchou API</title>
    <link rel="stylesheet" href="${swaggerStyles}">
  </head>
  <body>
    <main id="swagger-ui"></main>
    <script src="${swaggerBundle}"></script>
    <script>${init}</script>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": [
          "default-src 'none'",
          `script-src 'self' 'sha256-${hash}'`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "connect-src 'self'",
          "base-uri 'none'",
          "frame-ancestors 'none'",
          "form-action 'none'",
        ].join("; "),
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
};
