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

  // 允许跨域请求
  exports.cors = {
    origin: "*",
    allowMethods: "GET,HEAD,PUT,POST,DELETE,PATCH",
  };

  config.autoAuth = process.env.AUTO_AUTH;

  // 每回合限时
  config.ROUND_TIME_LIMIT = 30 * 1000;
  // 玩家离线限制
  config.OFFLINE_TIME_LIMIT = 2 * 1000;
  // AI行动等待时间
  config.AI_WAIT_TIME = 1.5 * 1000;
  // 玩家进入托管的离线时间限制
  config.AUTOMATIC_TIME_LIMIT = 2 * 60 * 1000;

  return config;
};
