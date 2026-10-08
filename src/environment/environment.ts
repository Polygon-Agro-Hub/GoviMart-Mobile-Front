import { getDevServerHostIp } from "./getHostIp";
const devHostIp = getDevServerHostIp();

export const environment = {

  // LOCAL --------------------
  // API_BASE_URL: `http://${devHostIp}:3000/polygon/`,

  // DEV --------------------
   API_BASE_URL: "https://dev-mob-api.polygon.lk/polygon/",

  // UAT --------------------
  // API_BASE_URL: "https://uat-mob-api.polygon.lk/polygon/",

  // PROD --------------------
 // API_BASE_URL: "https://mob-api.polygon.lk/polygon/",
};