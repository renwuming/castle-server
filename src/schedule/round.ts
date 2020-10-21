import { GameBaseService } from "@/app/game/game.base.service";
import { GameService } from "@/app/game/game.service";
import { PlayerService } from "@/app/game/player.service";
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
const AUTO_ACTION_MAX = 5;

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
    let { roundData, _id } = data;
    const { startedAt } = roundData;
    const isAutomaticRound = this.playerService.isAutomaticRound(data);
    const roundTimeLimit = isAutomaticRound ? 2000 : this.ROUND_TIME_LIMIT;
    // 回合是否超时
    let overTime = Date.now() - startedAt >= roundTimeLimit;

    if (overTime) {
      // 添加超时记录
      this.gameService.addOvertimeRecord(data);
    }

    for (let i = 0; i < AUTO_ACTION_MAX && overTime; i++) {
      roundData = await this.handleRound(_id, roundData, data);
      const { startedAt, end } = roundData;
      overTime = !end && Date.now() - startedAt >= roundTimeLimit;
    }
  }

  async handleRound(id: string, round: Round, game: Game): Promise<Round> {
    const { status, canAttackLocations, selectProps, throwProps } = round;
    let newRound: Round = round;
    // 若尚未移动/攻击
    if (status === -1) {
      // 能攻击则随机攻击
      if (canAttackLocations.length >= 1) {
        const randomLocation = shuffle(canAttackLocations)[0];
        newRound = await this.gameService.updateGame(id, {
          attackLocation: randomLocation,
        });
      } else {
        // 否则按照算法移动
        const targetLocation = this.selectLocation(round, game);
        newRound = await this.gameService.updateGame(id, {
          targetLocation,
        });
      }
    }
    // 选择获得道具
    else if (status === 0) {
      const props = shuffle(selectProps || []);
      const randomProp = props[0];
      newRound = await this.gameService.updateGame(id, {
        prop: randomProp,
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

  selectLocation(round: Round, game: Game): number {
    const { players } = game;
    const { player, canMoveLocations } = round;
    const currentPlayer = players[player];
    const { target } = currentPlayer;
    const isEscaper = this.playerService.isEscaper(currentPlayer);
    const canMoveToTarget = canMoveLocations.includes(target);
    // 若是逃亡者，且能到达目标点，则走向目标点
    if (canMoveToTarget && isEscaper) {
      return target;
    } else {
      const randomLocation = shuffle(canMoveLocations)[0];
      return randomLocation;
    }
  }
}
