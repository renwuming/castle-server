// 用来修正ts中的path-alias
function fixPath() {
  if (process.env.NODE_ENV == "production") {
    const moduleAlias = require("module-alias");
    const path = require("path");
    // todo：从tsconfig获取配置
    moduleAlias.addAliases({
      "@": path.join(__dirname, "../../../dist/"),
    });
  } else {
    require("tsconfig-paths").register();
  }
}

export default fixPath();
