import { provide, inject, Context, config } from "midway";
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
  @config()
  ROUND_TIME_LIMIT: number;

  /**
   * 获取游戏列表
   */
  public async getGames(
    skip: number = 0,
    end: boolean
  ): Promise<
    (Game & {
      win?: boolean;
    })[]
  > {
    const { _id: userID } = this.ctx.state.user;
    const sortQuery = end ? { endedAt: -1 } : { createdAt: -1 };
    const games = await this.gameBaseService.elemMatch(
      "players",
      {
        _id: userID,
      },
      skip,
      10,
      { end },
      sortQuery,
      {
        players: 1,
        winner: 1,
        start: 1,
        startedAt: 1,
        endedAt: 1,
        createdAt: 1,
      }
    );
    if (end) {
      return games.map((game) => {
        const { players, winner } = game;
        const win = players.map((item) => item._id).indexOf(userID) === winner;

        return {
          ...game,
          win,
        };
      });
    } else {
      return games;
    }
  }

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
      onlineTimeStampMap: {
        [userID]: Date.now(),
      },
    };
    const { _id } = await this.gameBaseService.insert(gameData);
    return {
      _id,
    };
  }

  public async getGame(
    id: string
  ): Promise<
    Game & {
      ownGame: boolean;
      inGame: boolean;
      ownTurn: boolean;
      playerIndex: number;
    }
  > {
    const game = await this.gameBaseService.getById(id);
    const timeStamp = Date.now();
    const { ownPlayer, players, roundData, end, onlineTimeStampMap } = game;
    const { _id } = this.ctx.state.user;
    const ownGame = this.utils.isEqualStr(_id, ownPlayer);
    const inGame = players.map((item) => item._id).includes(_id);
    let ownTurn = false;
    const playerIndex = players.map((item) => item._id).indexOf(_id);
    if (inGame && roundData && !end) {
      const { player } = roundData;
      ownTurn = playerIndex === player;
    }

    // 处理玩家在线状态、托管状态
    this.playerService.handlePlayersOnline(players, onlineTimeStampMap);

    // 处理players的移动、攻击范围
    const playersWithMoveAttackRange = this.playerService.getPlayersWithMoveAttackRange(
      players
    );

    if (roundData) {
      // 处理倒计时
      const { autoEndAt } = roundData;
      const countdown = ~~((autoEndAt - timeStamp) / 1000);
      roundData.countdown = countdown > 0 ? countdown : 0;
    }

    return {
      ...game,
      players: playersWithMoveAttackRange,
      ownGame,
      inGame,
      ownTurn,
      playerIndex,
    };
  }

  public async joinGame(id: string) {
    const player = this.initPlayerByUser(this.ctx.state.user);
    const { players } = await this.gameBaseService.getById(id);
    const { _id } = player;
    if (players.map((item) => item._id).includes(_id)) {
      return;
    } else if (players.length >= 4) {
      throw new BadRequestError("人数已满");
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

  public async leaveGame(id: string) {
    const { _id } = this.ctx.state.user;
    const { players } = await this.gameBaseService.getById(id);
    if (players.map((item) => item._id).includes(_id)) {
      const newPlayers = players.filter((item) => item._id !== _id);
      await this.gameBaseService.update({
        _id: id,
        updates: {
          players: newPlayers,
        },
      });
    }
  }

  public async startGame(id: string) {
    const {
      ownPlayer,
      players,
      onlineTimeStampMap,
    } = await this.gameBaseService.getById(id);
    const { _id } = this.ctx.state.user;
    // 处理玩家在线状态
    this.playerService.handlePlayersOnline(players, onlineTimeStampMap);
    const allOnline = players.every((player) => player.online);
    // 并非所有人在线
    if (!allOnline) {
      throw new BadRequestError("有玩家离线，无法开始游戏");
    }
    // 人数小于等于1
    else if (players.length <= 1) {
      throw new BadRequestError("人数不足");
    }
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
    } else {
      throw new UnprocessableEntityError("不是房主");
    }
  }

  public async updateGame(id: string, round: Partial<Round>): Promise<Round> {
    const gameData = await this.gameBaseService.getById(id);
    const { roundData, players, cards, start, end, roundHistory } = gameData;
    // game未开始或已结束
    if (!start || end) {
      throw new BadRequestError("游戏未开始或已结束");
    }
    const { status, player, canMoveLocations, canAttackLocations } = roundData;
    const currentPlayer = players[player];
    const { _id, location } = currentPlayer;
    const { AutoAciton } = this.ctx.state;
    const ownTurn = this.ctx.state.user
      ? _id === this.ctx.state.user._id
      : false;
    // 判断是否当前行动玩家
    if (!AutoAciton && !ownTurn) {
      throw new UnprocessableEntityError("It's not your turn");
    }

    // 玩家手动操作，则清除超时记录
    if (ownTurn) {
      await this.clearOvertimeRecord(gameData);
    }

    const { magicAction } = round;
    // 使用魔法
    if (magicAction) {
      const {
        magic: { key },
      } = magicAction;
      const hasMagic = this.playerService.hasMagic(currentPlayer, key);
      if (!hasMagic) {
        throw new BadRequestError("参数无效");
      }
      const updates = this.playerService.handleMagicAction(
        currentPlayer,
        players,
        player,
        magicAction,
        roundData
      );
      // 更新game的数据
      await this.gameBaseService.update({
        _id: id,
        updates,
      });
      return updates.roundData;
    }
    // 未移动
    else if (status === -1) {
      const { targetLocation, attackLocation } = round;
      const validTarget = targetLocation || targetLocation === 0;
      const validAttack = attackLocation || attackLocation === 0;
      const moveFlag =
        validTarget && canMoveLocations.includes(targetLocation as number);
      const attackFlag =
        validAttack && canAttackLocations.includes(attackLocation as number);
      if (!(moveFlag || attackFlag)) {
        throw new BadRequestError("参数无效");
      }
      let newRoundData: Round = roundData;
      // 玩家选择移动
      if (validTarget && moveFlag) {
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
          targetLocation as number,
          prop
        );
        players[player] = newCurrentPlayer;
        // 处理回合状态，道具选择
        newRoundData = this.playerService.updateRoundData(
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
      // 玩家选择攻击
      else if (validAttack && attackFlag) {
        const newPlayers = this.playerService.attackPlayerOnLocation(
          attackLocation as number,
          players
        );
        newRoundData = {
          ...roundData,
          status: 2 as RoundStatus,
          attackLocation,
        };
        // 更新game的roundData数据
        await this.gameBaseService.update({
          _id: id,
          updates: {
            roundData: newRoundData,
            players: newPlayers,
          },
        });
      }
      return newRoundData;
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
      newRoundData.selectProp = prop;
      // 更新game的roundData数据
      await this.gameBaseService.update({
        _id: id,
        updates: {
          roundData: newRoundData,
          players,
        },
      });
      return newRoundData;
    }
    // 移动但未丢弃道具
    else if (status === 1) {
      const { prop } = round;
      if (!prop) {
        throw new BadRequestError("参数无效");
      }
      const newCurrentPlayer = this.playerService.throwProp(
        prop,
        currentPlayer,
        "equipments"
      );
      players[player] = newCurrentPlayer;
      // 处理回合状态，道具选择
      const newRoundData = this.playerService.updateRoundData(
        roundData,
        undefined,
        newCurrentPlayer
      );
      newRoundData.throwProp = prop;
      // 更新game的roundData数据
      await this.gameBaseService.update({
        _id: id,
        updates: {
          roundData: newRoundData,
          players,
        },
      });
      return newRoundData;
    }
    // 结束回合
    else if (status === 2) {
      const { end } = round;
      if (!end) {
        throw new BadRequestError("参数无效");
      }
      const updates = this.endRound(roundData, roundHistory, players, cards);
      // 更新game的数据
      await this.gameBaseService.update({
        _id: id,
        updates,
      });
      return updates.roundData;
    }

    return roundData;
  }

  private initPlayers(players: Player[]): Player[] {
    const startPlayers = shuffle(players);
    const locations = shuffle(startLocations);
    startPlayers.forEach((player, index) => {
      player.index = index;
      const startLocation = locations[index];
      player.location = startLocation;
      player.target = 63 - startLocation;
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
      target: -1,
      status: [],
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

    const timeStamp = Date.now();
    return {
      player: index,
      startLocation: location,
      status: -1,
      canMoveLocations,
      canAttackLocations,
      magicActions: [],
      startedAt: timeStamp,
      autoEndAt: timeStamp + this.ROUND_TIME_LIMIT,
    };
  }

  private endRound(
    round: Round,
    roundHistory: Round[],
    players: Player[],
    cards: Card[]
  ): Partial<Game> & {
    roundData: Round;
  } {
    const { player } = round;
    round.end = true;
    roundHistory.push(round);
    // 计算winner
    const winner = this.playerService.getWinner(players);
    if (winner >= 0) {
      return {
        end: true,
        endedAt: new Date(),
        winner,
        roundData: round,
        roundHistory,
      };
    } else {
      // 处理角色
      const newPlayersAndCards = this.playerService.handlePlayerRoles(
        players,
        cards
      );
      const { players: newPlayers } = newPlayersAndCards;
      // 再次计算winner
      const winner = this.playerService.getWinner(newPlayers);
      if (winner >= 0) {
        return {
          ...newPlayersAndCards,
          end: true,
          endedAt: new Date(),
          winner,
          roundData: round,
          roundHistory,
        };
      } else {
        const {
          nextPlayer,
          newPlayers: finalPlayers,
        } = this.playerService.getNextPlayer(player, newPlayers);
        const newRoundData = this.initRound(nextPlayer, finalPlayers);
        return {
          ...newPlayersAndCards,
          players: finalPlayers,
          roundData: newRoundData,
          roundHistory,
        };
      }
    }
  }

  public async handleAutoEndRound(id: string): Promise<Round> {
    const {
      roundData,
      players,
      roundHistory,
      cards,
    } = await this.gameBaseService.getById(id);
    const { player, status } = roundData;
    // 如果已结束移动
    if (status === 2) {
      const currentPlayer = players[player];
      const { magics } = currentPlayer;
      // 若无魔法，则直接结束回合
      if (magics.length <= 0) {
        const updates = this.endRound(roundData, roundHistory, players, cards);
        // 更新game的数据
        await this.gameBaseService.update({
          _id: id,
          updates,
        });
        return updates.roundData;
      }
    }
    return roundData;
  }

  public async getAchievements(userID: string) {
    const historyGames = await this.gameBaseService.elemMatch(
      "players",
      {
        _id: userID,
      },
      0,
      undefined,
      { end: true },
      {
        players: 1,
        winner: 1,
      }
    );

    const Sum = historyGames.length;
    let WinSum = 0;
    let WinValue = 0;
    let KnightSum = 0;
    let KingSum = 0;
    let QueenSum = 0;
    let ServantSum = 0;
    let NoRoleSum = 0;

    historyGames.forEach((game) => {
      const { winner, players } = game;
      const index = players.map((item) => item._id).indexOf(userID);
      const player = players[index];
      if (!player) return;
      if (index === winner) {
        WinSum++;
        WinValue += players.length / 2;
        // 玩家获胜时的角色
        const { roles } = player;
        let role: string;
        if (roles.length <= 0) {
          role = "r-0";
        } else {
          role = roles.slice(-1)[0].key;
        }
        if (role === "r-0") {
          NoRoleSum++;
        } else if (role === "r-1") {
          KnightSum++;
        } else if (role === "r-2") {
          KingSum++;
        } else if (role === "r-3") {
          QueenSum++;
        } else if (role === "r-4") {
          ServantSum++;
        }
      }
    });
    const WinRate = Sum > 0 ? ((WinValue / Sum) * 100).toFixed(2) : "0.00";
    return {
      WinRate,
      Sum,
      WinSum,
      KnightSum,
      KingSum,
      QueenSum,
      ServantSum,
      NoRoleSum,
    };
  }

  public async updateOnlineTimeStampMap(id: string) {
    const game = await this.gameBaseService.getById(id);
    const { onlineTimeStampMap } = game;
    const { _id } = this.ctx.state.user;
    const map = new Map(Object.entries(onlineTimeStampMap));
    map.set(_id, Date.now());

    await this.gameBaseService.update({
      _id: id,
      updates: {
        onlineTimeStampMap: map,
      },
    });
  }

  public async addOvertimeRecord(data: Game) {
    let { roundData, players, _id } = data;
    const { player } = roundData;
    players[player].overtime = true;
    await this.gameBaseService.update({
      _id,
      updates: {
        players,
      },
    });
  }

  public async clearOvertimeRecord(data: Game) {
    let { roundData, players, _id } = data;
    const { player } = roundData;
    players[player].overtime = false;

    await this.gameBaseService.update({
      _id,
      updates: {
        players,
      },
    });
  }
}
