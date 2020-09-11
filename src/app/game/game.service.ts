import { provide, inject, Context } from "midway";
import { v4 } from "uuid";
import { propsConfig, startLocations } from "src/lib/gameHelper";
import { shuffle } from "lodash";
import { GameBaseService } from "./game.base.service";
import { Utils } from "src/lib/utils";
import { UnprocessableEntityError, BadRequestError } from "egg-errors";
import { MoveService } from "./move.service";

@provide()
export class GameService {
  @inject()
  ctx: Context;
  @inject()
  utils: Utils;
  @inject()
  gameBaseService: GameBaseService;
  @inject()
  moveService: MoveService;

  /**
   * 创建游戏
   */
  public async createGame(): Promise<Partial<Game>> {
    // 初始化卡片列表（地图）
    let initProps: Prop[] = [];
    propsConfig.forEach((item) => {
      const { data, count } = item;
      const list: Prop[] = Array(count).fill(data);
      initProps = initProps.concat(list);
    });
    initProps = shuffle(initProps);
    const cards = initProps.map((prop, index) => ({
      id: index,
      prop,
      open: false,
    }));
    const { _id: userID } = this.ctx.state.user;
    const firstPlayer = this.initPlayerByUser(this.ctx.state.user);
    // 创建一条Game数据
    const gameData: Partial<Game> = {
      _id: v4(),
      start: false,
      end: false,
      winner: -1,
      cards,
      roundHistory: [],
      ownPlayer: userID,
      players: [firstPlayer],
    };
    const { _id } = await this.gameBaseService.insert(gameData);
    return {
      _id,
    };
  }

  public async getGame(id: string): Promise<Partial<Game>> {
    return await this.gameBaseService.getById(id);
  }

  public async joinGame(id: string) {
    const player = this.initPlayerByUser(this.ctx.state.user);
    const { players } = await this.gameBaseService.getById(id);
    const { _id } = player;
    if (players.map((item) => item._id).includes(_id)) {
      return;
    } else {
      players.push(player);
      await this.gameBaseService.update({
        _id: id,
        updates: {
          players,
        },
      });
    }
  }

  public async startGame(id: string) {
    const { ownPlayer, players } = await this.gameBaseService.getById(id);
    const { _id } = this.ctx.state.user;
    // 若是房主
    if (this.utils.isEqualStr(ownPlayer, _id)) {
      const startPlayers = this.initPlayers(players.slice(0, 4));
      this.gameBaseService.update({
        _id: id,
        updates: {
          start: true,
          players: startPlayers,
          currentPlayer: 0,
          startedAt: new Date(),
          roundData: this.initRound(startPlayers[0]),
        },
      });
    }
  }

  public async updateGame(id: string, round: Round) {
    const {
      roundData,
      players,
      cards,
      start,
      end,
    } = await this.gameBaseService.getById(id);
    // game未开始或已结束
    if (!start || end) {
      throw new BadRequestError("游戏未开始或已结束");
    }
    const { status, player } = roundData;
    const currentPlayer = players[player];
    const { _id, location } = currentPlayer;
    // 判断是否当前行动玩家
    if (_id !== this.ctx.state.user._id) {
      throw new UnprocessableEntityError("It's not your turn");
    }
    // 未移动
    if (status === -1) {
      const { targetLocation } = round;
      if (!targetLocation) {
        throw new BadRequestError("参数无效");
      }
      // 先翻开卡片
      const { prop, selectProps } = this.moveService.openCard(cards, location);
      cards[location].open = true;
      // 再移动
      const endLocation = this.moveService.move(
        currentPlayer,
        players,
        targetLocation,
        prop
      );
      currentPlayer.location = endLocation;
      // 处理道具变化
      if (!selectProps && prop) {
        this.moveService.playerAddProp(currentPlayer, prop);
      }
      // 更新roundData
      const newRoundData = this.moveService.updateRoundData(
        {
          ...roundData,
          prop,
          selectProps,
          targetLocation,
          endLocation,
        },
        currentPlayer
      );
      // 更新game的roundData数据
      await this.gameBaseService.update({
        _id: id,
        updates: {
          roundData: newRoundData,
          cards,
          players,
        },
      });
    }
    // 移动但未选择道具
    else if (status === 0 || status === 1) {
      const { prop } = round;
      if (!prop) {
        throw new BadRequestError("参数无效");
      }
    }
    this.ctx.body = {};
  }

  private initPlayers(players: Player[]): Player[] {
    const startPlayers = shuffle(players);
    const locations = shuffle(startLocations);
    startPlayers.forEach((player, index) => {
      player.index = index;
      player.location = locations[index];
    });

    return startPlayers;
  }

  private initPlayerByUser(user: Partial<Player>): Player {
    return {
      index: -1,
      location: -1,
      roles: [],
      equipments: [],
      magics: [],
      // 以下属性将被user覆盖
      _id: "",
      nickName: "",
      avatarUrl: "",
      ...user,
    };
  }

  public initRound(currentPlayer: Player): Round {
    const { index, location } = currentPlayer;
    return {
      player: index,
      startLocation: location,
      status: -1,
    };
  }
}
