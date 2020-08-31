/// <reference path="./typings.d.ts" />
import { Application } from "midway";

export = (app: Application) => {
  app.beforeStart(async () => {
    console.info("🚀 Your awesome APP is launching...");
    // start code
    console.info("✅ Your awesome APP launched");
  });
};
