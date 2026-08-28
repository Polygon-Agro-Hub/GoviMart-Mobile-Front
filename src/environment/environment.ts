export const environment = {

  // LOCAL --------------------
  API_BASE_URL: "http://192.168.8.155:3000/polygon/",

  // DEV --------------------
  // API_BASE_URL: "https://dev-mob-api.govimart.com/polygon/",

  // UAT --------------------
  // API_BASE_URL: "https://govimart-mobile-api-uat.vercel.app/polygon/",

  // PROD --------------------
  // API_BASE_URL: "https://govimart-mobile-api-prod.vercel.app/polygon/"

  /**
   * Shoutout SMS API key — injected at build time via expo-constants.
   * Set SHOUTOUT_API_KEY in your .env file (see .env.example).
   * The value is exposed through app.json `extra.shoutoutApiKey`.
   */
  get SHOUTOUT_API_KEY(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require("expo-constants").default;
      return (Constants.expoConfig?.extra?.shoutoutApiKey as string) ?? "";
    } catch {
      return "";
    }
  },
};
