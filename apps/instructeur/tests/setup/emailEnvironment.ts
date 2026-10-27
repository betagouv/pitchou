// Built test servers use NODE_ENV=production. Never inherit live sending or capture credentials.
export const TEST_EMAIL_ENVIRONMENT = {
  BREVO_API_KEY: "",
  MAILPIT_URL: "",
  PITCHOU_EMAIL_DELIVERY_DISABLED: "true",
};
