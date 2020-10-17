export const development = {
  watchDirs: [
    "agent.ts",
    "app.ts",
    "interface.ts",
    "app",
    "config",
    "lib",
    "middleware",
    "service",
    "schedule",
  ],
  overrideDefault: true,
  autoAuth: true,
};

export const mongoose = {
  client: {
    url: "mongodb://localhost:27017/castle",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    },
  },
};

export const authBaseUrl =
  "http://localhost:5555/weapp-user/validate_741236987";
