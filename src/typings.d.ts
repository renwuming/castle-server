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
  onlineTimeStampMap: any;
  // 开始后需要更新的属性
  start: boolean;
  startedAt: Date;
  players: Player[];
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
  canMoveLocations: number[];
  canAttackLocations: number[];
  startLocation: number;
  magicAction?: MagicAction; // 当前使用的魔法
  magicActions: MagicAction[]; // 当回合使用过的魔法列表
  attackLocation?: number;
  targetLocation?: number;
  endLocation?: number;
  prop?: Prop;
  selectProps?: Prop[];
  throwProps?: Prop[];
  selectProp?: Prop;
  throwProp?: Prop;
  end?: boolean; // 回合是否结束
  startedAt: number; // 回合开始的时间戳
  autoEndAt: number; // 回合将自动结束的时间戳
  // 为前端提供数据时，特有的属性
  countdown?: number; // 回合自动结束倒计时，单位秒
}

interface Player {
  // 游戏数据
  index: number;
  location: number;
  roles: Prop[];
  equipments: Prop[];
  magics: Prop[];
  target: number;
  status: number[]; // 玩家状态：0 被冰冻
  canMoveLocations?: number[];
  canAttackLocations?: number[];
  dead?: boolean;
  // 用户信息
  _id: string;
  nickName: string;
  avatarUrl: string;
  // 为前端提供数据时，特有的属性
  online?: boolean; // 是否在线
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

interface MagicAction {
  magic: Prop;
  target: number;
  targetEquipment: Prop;
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
