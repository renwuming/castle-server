import { EggAppInfo } from "midway";

import { DefaultConfig } from "./config.modal";

export default (appInfo: EggAppInfo) => {
  const config = {} as DefaultConfig;

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + "_1598796719509_4288";

  // add your config here
  config.middleware = [];

  config.welcomeMsg = "Hello midwayjs!";

  config.mongoose = {
    client: {
      url: "mongodb://localhost:27017/castle",
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      },
    },
  };

  return config;
};
