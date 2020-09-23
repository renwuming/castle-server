import { EggAppInfo } from "midway";

import { config as dotEnvConfig } from "dotenv";
import { DefaultConfig } from "./config.modal";

export default (appInfo: EggAppInfo) => {
  dotEnvConfig();
  const config = {} as DefaultConfig;

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + "_1598796719509_4288";

  // add your config here
  config.middleware = [];

  config.autoAuth = process.env.AUTO_AUTH;
  return config;
};
