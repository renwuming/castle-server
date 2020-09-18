import { provide, inject, Context } from "midway";
import { v4 } from "uuid";
import { propsConfig, startLocations } from "@/lib/gameHelper";
import { shuffle } from "lodash";
import { GameBaseService } from "./game.base.service";
import { Utils } from "@/lib/utils";
import { UnprocessableEntityError, BadRequestError } from "egg-errors";
import { PlayerService } from "./player.service";

@provide()
export class GameService {
  @inject()
  ctx: Context;
  @inject()
  utils: Utils;
  @inject()
  gameBaseService: GameBaseService;
  @inject()
  playerService: PlayerService;

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
          startedAt: new Date(),
          roundData: this.initRound(startPlayers[0], startPlayers),
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
      roundHistory,
    } = await this.gameBaseService.getById(id);
    // game未开始或已结束
    if (!start || end) {
      throw new BadRequestError("游戏未开始或已结束");
    }
    const { status, player, canMoveLocations } = roundData;
    const currentPlayer = players[player];
    const { _id, location } = currentPlayer;
    // 判断是否当前行动玩家
    if (_id !== this.ctx.state.user._id) {
      throw new UnprocessableEntityError("It's not your turn");
    }
    // 未移动
    if (status === -1) {
      const { targetLocation } = round;
      if (!targetLocation || !canMoveLocations.includes(targetLocation)) {
        throw new BadRequestError("参数无效");
      }
      // 更新targetLocation
      roundData.targetLocation = targetLocation;
      // 翻开卡片
      const { prop, cards: newCards } = this.playerService.openCard(
        cards,
        location
      );
      // 移动，并获取道具
      const newCurrentPlayer = this.playerService.moveAndPickProp(
        currentPlayer,
        players,
        targetLocation,
        prop
      );
      players[player] = newCurrentPlayer;
      // 处理回合状态，道具选择
      const newRoundData = this.playerService.updateRoundData(
        roundData,
        prop,
        newCurrentPlayer
      );
      // 更新game的roundData数据
      await this.gameBaseService.update({
        _id: id,
        updates: {
          roundData: newRoundData,
          cards: newCards,
          players,
        },
      });
    }
    // 移动但未选择道具
    else if (status === 0) {
      const { prop } = round;
      if (!prop) {
        throw new BadRequestError("参数无效");
      }
      const { status } = prop;
      const newCurrentPlayer = this.playerService.selectProp(
        status,
        currentPlayer
      );
      players[player] = newCurrentPlayer;
      // 处理回合状态，道具选择
      const newRoundData = this.playerService.updateRoundData(
        roundData,
        undefined,
        newCurrentPlayer
      );
      // 更新game的roundData数据
      await this.gameBaseService.update({
        _id: id,
        updates: {
          roundData: newRoundData,
          players,
        },
      });
    }
    // 移动但未丢弃道具
    else if (status === 1) {
      const { prop } = round;
      if (!prop) {
        throw new BadRequestError("参数无效");
      }
      const newCurrentPlayer = this.playerService.throwProp(
        prop,
        currentPlayer
      );
      players[player] = newCurrentPlayer;
      // 处理回合状态，道具选择
      const newRoundData = this.playerService.updateRoundData(
        roundData,
        undefined,
        newCurrentPlayer
      );
      // 更新game的roundData数据
      await this.gameBaseService.update({
        _id: id,
        updates: {
          roundData: newRoundData,
          players,
        },
      });
    }
    // 结束回合
    else if (status === 2) {
      const { end } = round;
      if (!end) {
        throw new BadRequestError("参数无效");
      }
      const {
        round: newRoundData,
        roundHistory: newRoundHistory,
      } = this.endRound(roundData, roundHistory, players);
      // 更新game的roundData数据
      await this.gameBaseService.update({
        _id: id,
        updates: {
          roundData: newRoundData,
          roundHistory: newRoundHistory,
        },
      });
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

  private initRound(currentPlayer: Player, players: Player[]): Round {
    const { index, location } = currentPlayer;
    const canMoveLocations = this.playerService.canMoveLocations(
      currentPlayer,
      players
    );
    const canAttackLocations = this.playerService.canAttackLocations(
      currentPlayer,
      players
    );
    return {
      player: index,
      startLocation: location,
      status: -1,
      canMoveLocations,
      canAttackLocations,
    };
  }

  private endRound(
    round: Round,
    roundHistory: Round[],
    players: Player[]
  ): {
    round: Round;
    roundHistory: Round[];
  } {
    const { player } = round;
    round.end = true;
    roundHistory.push(round);
    const nextPlayerIndex = (player + 1) % players.length;
    const newRoundData = this.initRound(players[nextPlayerIndex], players);
    return {
      round: newRoundData,
      roundHistory,
    };
  }
}
