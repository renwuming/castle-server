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
  _id?: string;
  currentPlayer: number;
  createdAt: Date;
  updatedAt: Date;
  start: boolean;
  startedAt: Date;
  end: boolean;
  winner: number;
  cards: Card[];
  players: Player[];
  roundIndex: number;
  roundData: Round;
  roundHistory: Round[];
}

/**
 * 回合状态
 **/
type RoundStatus = -1 | 0 | 1; // -1 未移动，0 完成移动但未完成道具选择，1 完成移动与道具选择

interface Round {
  index?: number;
  player: number;
  status: RoundStatus;
  startLocation: number;
  targetLocation?: number;
  endLocation?: number;
  prop?: Prop;
}

interface Player {
  index: number;
  location: number;
  roles: Prop[];
  equipments: Prop[];
  magics: Prop[];
  id: string;
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
  data: Prop;
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
