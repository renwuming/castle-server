// 使用 tsconfig-paths 来 hook 掉 node 中的模块路径解析逻辑，从而支持 tsconfig.json 中的 paths
import "tsconfig-paths/register";

export const cors = {
  enable: false,
  package: "egg-cors",
};

export const mongoose = {
  enable: true,
  package: "egg-mongoose",
};

// false 禁用全部安全检查用于临时调试
export const security = false;
