import { GameBaseService } from "@/app/game/game.base.service";
import { GameService } from "@/app/game/game.service";
import { PlayerService } from "@/app/game/player.service";
import {
  magicDisarm,
  magicFreeze,
  selectShieldList,
  shieldKeyStatusList,
} from "@/lib/gameHelper";
import { Utils } from "@/lib/utils";
import { shuffle } from "lodash";
import {
  provide,
  schedule,
  CommonSchedule,
  inject,
  Context,
  config,
} from "midway";

// 一个while循环，自动行动的最大次数
const AUTO_ACTION_MAX = 10;

@provide()
@schedule({
  interval: 1500, // 1.5s 间隔
  type: "all",
})
export class RoundCron implements CommonSchedule {
  @inject()
  gameBaseService: GameBaseService;
  @inject()
  gameService: GameService;
  @inject()
  playerService: PlayerService;
  @inject()
  ctx: Context;
  @config()
  ROUND_TIME_LIMIT: number;
  @config()
  AI_WAIT_TIME: number;
  @inject()
  utils: Utils;

  // 定时计算回合是否自动结束
  async exec() {
    const games = await this.gameBaseService.find({
      start: true,
      end: false,
    });

    // 标识为服务端自动行动，无需验证用户信息
    this.ctx.state.AutoAciton = true;

    games.forEach((game) => {
      this.handleGame(game);
    });
  }

  async handleGame(data: Game) {
    let { roundData, _id, lock, players } = data;
    if (lock) return;
    // 添加锁
    await this.gameBaseService.update({
      _id,
      updates: {
        lock: true,
      },
    });
    const { startedAt, player } = roundData;
    const currentPlayer = players[player];
    const { ai } = currentPlayer;
    const isAutomaticRound = this.playerService.isAutomaticRound(data);
    const roundTimeLimit = isAutomaticRound ? 2000 : this.ROUND_TIME_LIMIT;
    // 回合是否超时
    let overTime = Date.now() - startedAt >= roundTimeLimit;

    if (overTime) {
      // 添加超时记录
      this.gameService.addOvertimeRecord(data);
    }

    for (let i = 0; i < AUTO_ACTION_MAX && overTime; i++) {
      if (ai) {
        roundData = await this.handleAIRound(_id, roundData);
      } else {
        roundData = await this.handleRound(_id, roundData);
      }
      const { startedAt, end } = roundData;
      overTime = !end && Date.now() - startedAt >= roundTimeLimit;
      await this.utils.sleep(this.AI_WAIT_TIME);
    }

    // 去掉锁
    await this.gameBaseService.update({
      _id,
      updates: {
        lock: false,
      },
    });
  }

  async handleAIRound(id: string, round: Round): Promise<Round> {
    const { status, canAttackLocations, throwProps } = round;
    const game = await this.gameBaseService.getById(id);
    let newRound: Round = round;
    // 若尚未移动/攻击
    if (status === -1) {
      // 智能攻击
      if (canAttackLocations.length >= 1) {
        const attackLocation = await this.selectAttack(round, game);
        // 若攻击，则直接return
        if (attackLocation) {
          newRound = await this.gameService.updateGame(id, {
            attackLocation,
          });
          return newRound;
        }
      }
      // 智能移动
      const targetLocation = this.selectLocation(round, game);
      newRound = await this.gameService.updateGame(id, {
        targetLocation,
      });
    }
    // 选择获得道具
    else if (status === 0) {
      const prop = this.AISelectProps(round, game);
      newRound = await this.gameService.updateGame(id, {
        prop,
      });
    }
    // 选择丢弃道具
    else if (status === 1) {
      const props = shuffle(throwProps || []);
      const randomProp = props[0];
      newRound = await this.gameService.updateGame(id, {
        prop: randomProp,
      });
    }
    // 回合已经可以结束
    else if (status === 2) {
      // 智能施放魔法
      await this.selectMagic(round, game);
      newRound = await this.gameService.updateGame(id, {
        end: true,
      });
    }
    return newRound;
  }

  async handleRound(id: string, round: Round): Promise<Round> {
    const {
      status,
      canAttackLocations,
      canMoveLocations,
      selectProps,
      throwProps,
    } = round;
    let newRound: Round = round;
    // 若尚未移动/攻击
    if (status === -1) {
      // 随机攻击/移动
      const locations = canAttackLocations.concat(canMoveLocations);
      const location = shuffle(locations)[0];
      if (canMoveLocations.includes(location)) {
        newRound = await this.gameService.updateGame(id, {
          targetLocation: location,
        });
      } else {
        newRound = await this.gameService.updateGame(id, {
          attackLocation: location,
        });
      }
    }
    // 选择获得道具
    else if (status === 0) {
      const prop = shuffle(selectProps || [])[0];
      newRound = await this.gameService.updateGame(id, {
        prop,
      });
    }
    // 选择丢弃道具
    else if (status === 1) {
      const props = shuffle(throwProps || []);
      const randomProp = props[0];
      newRound = await this.gameService.updateGame(id, {
        prop: randomProp,
      });
    }
    // 回合已经可以结束
    else if (status === 2) {
      newRound = await this.gameService.updateGame(id, {
        end: true,
      });
    }
    return newRound;
  }

  AISelectProps(round: Round, game: Game): Prop {
    const { players } = game;
    const { player } = round;
    const currentPlayer = players[player];
    // 若已经拥有【刃】，则只会选择【盾】
    const hasBlade = this.playerService.hasEquipment(
      currentPlayer,
      shieldKeyStatusList[0]
    );
    return hasBlade ? selectShieldList[1] : shuffle(selectShieldList)[0];
  }

  selectLocation(round: Round, game: Game): number {
    const { players } = game;
    const { player, canMoveLocations } = round;
    const currentPlayer = players[player];
    const { target } = currentPlayer;
    const isEscaper = this.playerService.isEscaper(currentPlayer);
    const canMoveToTarget = canMoveLocations.includes(target);
    const safeLocations = this.playerService.canMoveSafeLocations(
      currentPlayer,
      players
    );
    // 尽量移动到不会被攻击的位置
    const AILocations =
      safeLocations.length > 0 ? safeLocations : canMoveLocations;
    // 若是逃亡者，则直达目标点
    if (isEscaper && canMoveToTarget) {
      return target;
    }
    // 若是逃亡者，则保证安全的情况下，尽量靠近目标点
    else if (isEscaper) {
      const locations = AILocations.sort((a, b) => {
        const distance1 = this.playerService.calculateDistanceBetweenLocations(
          a,
          target
        );
        const distance2 = this.playerService.calculateDistanceBetweenLocations(
          b,
          target
        );

        return distance1 - distance2;
      });
      return locations[0];
    }
    // 否则，随机移动
    else {
      return shuffle(AILocations)[0];
    }
  }

  async selectAttack(round: Round, game: Game): Promise<number | void> {
    const { players } = game;
    const { player } = round;
    const currentPlayer = players[player];
    const playersCanAttackMe = this.playerService.getPlayersCanAttackMe(
      currentPlayer,
      players
    );
    // 如果超过两个玩家可以攻击到我，则移动
    if (playersCanAttackMe.length >= 2) return;
    // 若只有一个玩家可以攻击到我
    else if (playersCanAttackMe.length === 1) {
      const targetPlayer = playersCanAttackMe[0];
      const canKillOther = this.playerService.canKillPlayer(
        currentPlayer,
        targetPlayer,
        players
      );
      const canBeKilled = this.playerService.canKillPlayer(
        targetPlayer,
        currentPlayer,
        players
      );
      // 若我能杀死可以攻击我的玩家
      if (canKillOther) {
        // 先施放对应魔法
        await this.handleMagicsToKill(round, game, targetPlayer);
        // 再进行攻击
        return targetPlayer.location;
      }
      // 这位玩家杀不死我
      else if (!canBeKilled) {
        return targetPlayer.location;
      }
      // 否则移动
      else return;
    }
    // 我是安全的
    else {
      const canAttackLocations = this.playerService.canAttackLocations(
        currentPlayer,
        players
      );
      const canAttackPlayers = canAttackLocations.map(
        (location) =>
          this.playerService.getPlayerByLocation(location, players) as Player
      );
      const canKillPlayers = canAttackPlayers.filter((player) =>
        this.playerService.canKillPlayer(currentPlayer, player, players)
      );
      // 优先攻击能杀死的玩家
      if (canKillPlayers.length >= 1) {
        const targetPlayer = shuffle(canKillPlayers)[0];
        // 先施放对应魔法
        await this.handleMagicsToKill(round, game, targetPlayer);
        // 再进行攻击
        return targetPlayer.location;
      }
      // 否则，随机攻击
      else {
        return shuffle(canAttackLocations)[0];
      }
    }
  }

  async selectMagic(round: Round, game: Game): Promise<MagicAction | void> {
    const { players } = game;
    const { player } = round;
    const currentPlayer = players[player];
    const { magics } = currentPlayer;
    if (magics.length <= 0) return;
    const canAttackMePlayers = this.playerService.getPlayersCanAttackMe(
      currentPlayer,
      players
    );
    const canKillMePlayers = canAttackMePlayers.filter((item) => {
      return this.playerService.canKillPlayer(item, currentPlayer, players);
    });
    // 如果有玩家可以杀死我
    if (canKillMePlayers.length >= 1) {
      for (let i = 0; i < canKillMePlayers.length; i++) {
        const targetPlayer = canKillMePlayers[i];
        await this.handleMagicToDefense(round, game, targetPlayer);
      }
    }
    // 看看我能杀死谁
    const canAttackLocations = this.playerService.canAttackLocations(
      currentPlayer,
      players
    );
    const canAttackPlayers = canAttackLocations.map(
      (location) =>
        this.playerService.getPlayerByLocation(location, players) as Player
    );
    const canKillPlayers = canAttackPlayers.filter((player) =>
      this.playerService.canKillPlayer(currentPlayer, player, players, false)
    );
    // 随机选择一个能杀死的玩家，施放魔法
    if (canKillPlayers.length >= 1) {
      const targetPlayer = shuffle(canKillPlayers)[0];
      // 施放对应魔法
      await this.handleMagicsToKill(round, game, targetPlayer, false);
    }
  }

  // 为了防守而施放魔法
  async handleMagicToDefense(round: Round, game: Game, targetPlayer: Player) {
    const { players, _id } = game;
    const { index, equipments } = targetPlayer;
    const { player } = round;
    const currentPlayer = players[player];
    const hasDisarm = this.playerService.hasMagic(
      currentPlayer,
      magicDisarm.key
    );
    const hasFreeze = this.playerService.hasMagic(
      currentPlayer,
      magicFreeze.key
    );
    // 有【冰弹】则直接施放
    if (hasFreeze) {
      await this.gameService.updateGame(_id, {
        magicAction: {
          magic: magicFreeze,
          target: index,
        },
      });
      return;
    }
    // 有【缴械】
    else if (hasDisarm) {
      const noEquipmentPlayer: Player = {
        ...targetPlayer,
        equipments: [],
      };
      // 无装备情况下，是否仍然能杀死我
      const canKillMeWithoutEquipments = this.playerService.canKillPlayer(
        noEquipmentPlayer,
        currentPlayer,
        players
      );
      if (canKillMeWithoutEquipments) {
        await this.handleMagicToDeath(round, game);
      } else {
        // 遍历敌人所有装备，【缴械】其用于攻击我们的装备
        for (let i = 0; i < equipments.length; i++) {
          const eq = equipments[i];
          const withThisEqPlayer = {
            ...targetPlayer,
            equipments: [eq],
          };
          const canKillMeWithThisEquipment = this.playerService.canKillPlayer(
            withThisEqPlayer,
            currentPlayer,
            players
          );
          // 若此装备对于攻击我们有帮助，则【缴械】
          if (canKillMeWithThisEquipment) {
            try {
              await this.gameService.updateGame(_id, {
                magicAction: {
                  magic: magicDisarm,
                  target: index,
                  targetEquipment: eq,
                },
              });
              await this.utils.sleep(this.AI_WAIT_TIME);
            } catch (e) {
              // 【缴械】魔法不足
              break;
            }
          }
        }
      }
    }
  }

  // 即将死亡，随机用尽魔法
  async handleMagicToDeath(round: Round, game: Game) {
    let { players, _id } = game;
    const { player } = round;
    const currentPlayer = players[player];
    const { magics, index } = currentPlayer;
    for (let i = 0; i < magics.length; i++) {
      players = players.filter((item) => item.index !== index);
      const { key } = magics[i];
      // 【冰弹】
      if (key === magicFreeze.key) {
        const activePlayers = players.filter((item) =>
          this.playerService.isActive(item)
        );
        if (activePlayers.length > 0) {
          const target = shuffle(activePlayers)[0].index;
          await this.gameService.updateGame(_id, {
            magicAction: {
              magic: magicFreeze,
              target,
            },
          });
        }
      }
      // 【缴械】
      else if (key === magicDisarm.key) {
        const alivePlayers = players.filter((item) => !item.dead);
        const list = alivePlayers.reduce((res: any[], item) => {
          const { equipments, index } = item;
          const eqList = equipments.map((eq) => ({
            target: index,
            targetEquipment: eq,
          }));
          return res.concat(eqList);
        }, []);
        if (list.length > 0) {
          const targetPlayerAndEq = shuffle(list)[0];
          await this.gameService.updateGame(_id, {
            magicAction: {
              magic: magicDisarm,
              ...targetPlayerAndEq,
            },
          });
        }
      }
      const newGameData = await this.gameBaseService.getById(_id);
      players = newGameData.players;
      await this.utils.sleep(this.AI_WAIT_TIME);
    }
  }

  // 为了杀死对方而施放魔法
  async handleMagicsToKill(
    round: Round,
    game: Game,
    targetPlayer: Player,
    canAttack: boolean = true // 玩家是否还可以攻击，若不能，必须使用冰箭
  ) {
    const { players, _id } = game;
    const { player } = round;
    const { index } = targetPlayer;
    let currentPlayer = players[player];
    // 尽可能拆掉对方所有的【盾】
    while (
      this.playerService.hasMagic(currentPlayer, magicDisarm.key) &&
      this.playerService.hasEquipment(targetPlayer, shieldKeyStatusList[1])
    ) {
      await this.gameService.updateGame(_id, {
        magicAction: {
          magic: magicDisarm,
          target: index,
          targetEquipment: selectShieldList[1],
        },
      });
      await this.utils.sleep(this.AI_WAIT_TIME);
      const { players } = await this.gameBaseService.getById(_id);
      currentPlayer = players[player];
      targetPlayer = players[index];
    }

    // 获取最新的数据
    const newGameData = await this.gameBaseService.getById(_id);
    const { players: newPlayers } = newGameData;
    const newTargetPlayer = newPlayers[index];
    const newCurrentPlayer = newPlayers[player];
    const hasShield = this.playerService.hasEquipment(
      newTargetPlayer,
      shieldKeyStatusList[1]
    );
    const hasFreeze = this.playerService.hasMagic(
      newCurrentPlayer,
      magicFreeze.key
    );
    // 如果仍然有盾，则使用【冰弹】
    if ((!canAttack || hasShield) && hasFreeze) {
      await this.gameService.updateGame(_id, {
        magicAction: {
          magic: magicFreeze,
          target: index,
        },
      });
    }
  }
}
