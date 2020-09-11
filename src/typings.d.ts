type ID = string;
type UUID = string;
type PaginateQuery = {
  pageIndex: number;
  // how many item perpage
  pageSize?: number;
};

type Paginate<T> = {
  items: T[];
  pageTotal: number;
  pageIndex: number;
  total: number;
};

/**
 * 数据库存在collection的类型
 */
interface Game {
  _id: string;
  ownPlayer: string;
  cards: Card[];
  roundHistory: Round[];
  createdAt?: Date;
  updatedAt?: Date;
  // 开始后需要更新的属性
  start: boolean;
  startedAt: Date;
  players: Player[];
  currentPlayer: number;
  roundData: Round;
  // 结束后需要更新的属性
  end: boolean;
  endedAt: Date;
  winner: number;
}

/**
 * 回合状态
 **/
type RoundStatus = -1 | 0 | 1 | 2; // 枚举值，-1 未移动，0 完成移动但未完成刃盾选择，1 完成移动但需要丢弃装备，2 完成移动

interface Round {
  player: number;
  status: RoundStatus;
  startLocation: number;
  targetLocation?: number;
  endLocation?: number;
  prop?: Prop;
  selectProps?: Prop[];
}

interface Player {
  // 游戏数据
  index: number;
  location: number;
  roles: Prop[];
  equipments: Prop[];
  magics: Prop[];
  dead?: boolean;
  // 用户信息
  _id: string;
  nickName: string;
  avatarUrl: string;
}

interface Prop {
  name: string;
  imgUrl: string;
  imgHdUrl: string;
  key: string;
  status: number;
}

interface Card {
  id: number;
  prop: Prop;
  open: boolean;
}

/**
 * 工具类型
 */
type GetModelOption = {
  schemaDefination: any;
  schemaOption: any;
  modelName: string;
  collection: string;
};
