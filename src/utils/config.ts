import * as dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV;

const MONGODB_URI = NODE_ENV === "PRODUCTION" ? process.env.PRO_MONGODB_URI : process.env.MONGODB_URI;

const SALT_ROUND = Number(process.env.SALT_ROUND) || 10;

const PORT = Number(process.env.PORT) || 8000;

const JWT_SECRET = process.env.JWT_SECRET;

const SMART_SHIP_USERNAME = process.env.username;

const SMART_SHIP_PASSWORD = process.env.password;

const SMART_SHIP_CLIENT_ID = process.env.client_id;

const SMART_SHIP_CLIENT_SECRET = process.env.client_secret;

const SMART_SHIP_GRANT_TYPE = process.env.grant_type;

const SMART_SHIP_API_BASEURL = process.env.SMARTSHIP_API_BASEURL;

const SMARTR_USERNAME = process.env.SMARTR_USERNAME;

const SMARTR_PASSWORD = process.env.SMARTR_PASSWORD;

const envConfig = {
  NODE_ENV,
  MONGODB_URI,
  SALT_ROUND,
  PORT,
  JWT_SECRET,
  SMART_SHIP_USERNAME,
  SMART_SHIP_PASSWORD,
  SMART_SHIP_CLIENT_ID,
  SMART_SHIP_CLIENT_SECRET,
  SMART_SHIP_GRANT_TYPE,
  SMART_SHIP_API_BASEURL,
  SMARTR_USERNAME,
  SMARTR_PASSWORD,
};

export default envConfig;
