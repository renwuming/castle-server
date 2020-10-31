type PropConfig = {
  data: Prop;
  count: number;
};

export const maidservantRole: Prop = {
  name: "女佣",
  imgUrl: "https://cdn.renwuming.cn/static/escape/cards/r-4.png",
  imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/r-4-hd.jpg",
  key: "r-4",
  status: -1,
};

export const knightRole: Prop = {
  name: "叛军骑士",
  imgUrl: "https://cdn.renwuming.cn/static/escape/cards/r-1.png",
  imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/r-1-hd.jpg",
  key: "r-1",
  status: -1,
};

export const magicDisarm: Prop = {
  name: "缴械",
  imgUrl: "https://cdn.renwuming.cn/static/escape/cards/m-1.png",
  imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/m-1-hd.jpg",
  key: "m-1",
  status: -1,
};

export const magicFreeze: Prop = {
  name: "冰弹",
  imgUrl: "https://cdn.renwuming.cn/static/escape/cards/m-2.png",
  imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/m-2-hd.jpg",
  key: "m-2",
  status: -1,
};

export const propsConfig: PropConfig[] = [
  // 装备
  {
    data: {
      name: "流星锤",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/e-1.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/e-1-hd.jpg",
      key: "e-1",
      status: -1,
    },
    count: 4,
  },
  {
    data: {
      name: "刃盾",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/e-2.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/e-2-hd.jpg",
      key: "e-2",
      status: -1,
    },
    count: 4,
  },
  {
    data: {
      name: "安卡符",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/e-3.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/e-3-hd.jpg",
      key: "e-3",
      status: -1,
    },
    count: 4,
  },
  {
    data: {
      name: "小马哥",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/e-4.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/e-4-hd.jpg",
      key: "e-4",
      status: -1,
    },
    count: 4,
  },
  // 魔法
  {
    data: magicDisarm,
    count: 4,
  },
  {
    data: magicFreeze,
    count: 4,
  },
  // 陷阱
  {
    data: {
      name: "向东3格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-1.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-1-hd.jpg",
      key: "d-1",
      status: 3,
    },
    count: 3,
  },
  {
    data: {
      name: "向东2格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-1.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-1-hd.jpg",
      key: "d-1",
      status: 2,
    },
    count: 3,
  },
  {
    data: {
      name: "向东1格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-1.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-1-hd.jpg",
      key: "d-1",
      status: 1,
    },
    count: 3,
  },
  {
    data: {
      name: "向南3格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-2.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-2-hd.jpg",
      key: "d-2",
      status: 3,
    },
    count: 3,
  },
  {
    data: {
      name: "向南2格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-2.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-2-hd.jpg",
      key: "d-2",
      status: 2,
    },
    count: 3,
  },
  {
    data: {
      name: "向南1格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-2.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-2-hd.jpg",
      key: "d-2",
      status: 1,
    },
    count: 3,
  },
  {
    data: {
      name: "向西3格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-3.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-3-hd.jpg",
      key: "d-3",
      status: 3,
    },
    count: 3,
  },
  {
    data: {
      name: "向西2格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-3.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-3-hd.jpg",
      key: "d-3",
      status: 2,
    },
    count: 3,
  },
  {
    data: {
      name: "向西1格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-3.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-3-hd.jpg",
      key: "d-3",
      status: 1,
    },
    count: 3,
  },
  {
    data: {
      name: "向北3格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-4.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-4-hd.jpg",
      key: "d-4",
      status: 3,
    },
    count: 3,
  },
  {
    data: {
      name: "向北2格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-4.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-4-hd.jpg",
      key: "d-4",
      status: 2,
    },
    count: 3,
  },
  {
    data: {
      name: "向北1格",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/d-4.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/d-4-hd.jpg",
      key: "d-4",
      status: 1,
    },
    count: 3,
  },
  // 角色
  {
    data: knightRole,
    count: 1,
  },
  {
    data: maidservantRole,
    count: 1,
  },
  {
    data: {
      name: "国王",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/r-2.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/r-2-hd.jpg",
      key: "r-2",
      status: -1,
    },
    count: 1,
  },
  {
    data: {
      name: "王后",
      imgUrl: "https://cdn.renwuming.cn/static/escape/cards/r-3.png",
      imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/r-3-hd.jpg",
      key: "r-3",
      status: -1,
    },
    count: 1,
  },
];

export const startLocations: number[] = [0, 7, 56, 63];

export const selectShieldList: Prop[] = [
  {
    name: "刃",
    imgUrl: "https://cdn.renwuming.cn/static/escape/cards/e-2-0.png",
    imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/e-2-0-hd.jpg",
    key: "e-2",
    status: 0,
  },
  {
    name: "盾",
    imgUrl: "https://cdn.renwuming.cn/static/escape/cards/e-2-1.png",
    imgHdUrl: "https://cdn.renwuming.cn/static/escape/cards/e-2-1-hd.jpg",
    key: "e-2",
    status: 1,
  },
];

export const shieldKeyStatusList: string[] = ["e-2/0", "e-2/1"];
