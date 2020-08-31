import { provide, inject } from "midway";
import { v4 } from "uuid";
import { initPropsConfig } from "./props";
import { shuffle } from "lodash";
import { GameBaseService } from "./game.base.service";

@provide()
export class GameService {
  @inject() gameBaseService: GameBaseService;
  /**
   * 读取用户信息
   */
  public async createGame(): Promise<Partial<Game>> {
    // 初始化卡片列表（地图）
    let initProps: Prop[] = [];
    initPropsConfig.forEach((item) => {
      const { data, count } = item;
      const list: Prop[] = Array(count).fill(data);
      initProps = initProps.concat(list);
    });
    initProps = shuffle(initProps);
    const cards = initProps.map((prop, index) => ({
      id: index,
      data: prop,
      open: false,
    }));
    // 创建一条Game数据
    const gameData = {
      _id: v4(),
      cards,
      currentPlayer: 0,
      start: false,
      end: false,
      winner: -1,
      roundHistory: [],
      // players: [],
      // roundData: this.creatRound(0),
    };
    return await this.gameBaseService.insert(gameData);
  }

  public creatRound(currentPlayer: Player): Round {
    const { index, location } = currentPlayer;
    return {
      player: index,
      startLocation: location,
      status: -1,
    };
  }
}
