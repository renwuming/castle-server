import { provide, inject, config } from "midway";
import {
  selectShieldList,
  maidservantRole,
  knightRole,
  shieldKeyStatusList,
  magicDisarm,
  magicFreeze,
} from "@/lib/gameHelper";
import { Utils } from "@/lib/utils";
import { BadRequestError } from "egg-errors";
import { uniq } from "lodash";

@provide()
export class PlayerService {
  @config()
  OFFLINE_TIME_LIMIT: number;
  @config()
  AUTOMATIC_TIME_LIMIT: number;
  @inject()
  utils: Utils;

  EquipmentMaximum: number = 3;

  // 打开卡片
  public openCard(
    cards: Card[],
    location: number
  ): {
    prop?: Prop;
    cards: Card[];
  } {
    const card = cards[location];
    const { open, prop } = card;
    // 若是已打开的卡片，直接返回
    if (open) {
      return {
        cards,
      };
    } else {
      cards[location].open = true;
      return {
        prop,
        cards,
      };
    }
  }
  // 移动
  public moveAndPickProp(
    currentPlayer: Player,
    players: Player[],
    targetLocation: number,
    prop: Prop | undefined,
    round: Round
  ): Player {
    currentPlayer = this.pickProp(currentPlayer, prop);
    const moveWithoutTrap = {
      ...currentPlayer,
      location: targetLocation,
    };
    // 如果未翻开道具，或道具不是【陷阱】，直接更新player坐标
    if (!prop) {
      return moveWithoutTrap;
    }
    const { key, status } = prop;
    if (!key.includes("d")) {
      return moveWithoutTrap;
    } else {
      // 回合数据中，移动经过的所有坐标
      const { moveLocations } = round;
      let direction = +key.split("-")[1];
      let endLocation = targetLocation;
      for (let i = 0; i < status; i++) {
        let tempLocation = this.canMoveStepsToDirection(
          endLocation,
          direction,
          players,
          currentPlayer
        );
        if (tempLocation >= 0) {
          endLocation = tempLocation;
          // 更新移动所经过的坐标
          if (!moveLocations.includes(endLocation)) {
            moveLocations.push(endLocation);
          }
        }
        // 若撞墙/撞人，则调转方向
        else {
          direction = direction <= 2 ? direction + 2 : direction - 2;
          tempLocation = this.canMoveStepsToDirection(
            endLocation,
            direction,
            players,
            currentPlayer
          );
          if (tempLocation >= 0) {
            endLocation = tempLocation;
            // 更新移动所经过的坐标
            if (!moveLocations.includes(endLocation)) {
              moveLocations.push(endLocation);
            }
          }
          // 若调转方向也不行，说明无法移动
          else {
            return moveWithoutTrap;
          }
        }
      }
      return {
        ...currentPlayer,
        location: endLocation,
      };
    }
  }

  public canMoveLocations(currentPlayer: Player, players: Player[]): number[] {
    const { location } = currentPlayer;
    const KNIGHT = this.isKnight(currentPlayer);
    let MOVE = KNIGHT ? 2 : 1; // 移动距离
    let TILT = false; // 是否可以斜着走
    // 【安卡符】
    if (this.hasEquipment(currentPlayer, "e-3")) {
      TILT = true;
    }
    // 【小马哥】
    if (this.hasEquipment(currentPlayer, "e-4")) {
      MOVE += 1;
    }
    // 根据以上属性，计算可移动的位置
    const canMoveLocations: number[] = [];
    for (let dir = 1; dir <= 4; dir++) {
      for (let steps = 1; steps <= MOVE; steps++) {
        const canMoveLocation = this.canMoveStepsToDirection(
          location,
          dir,
          players,
          currentPlayer,
          steps
        );
        if (canMoveLocation >= 0) {
          canMoveLocations.push(canMoveLocation);
        } else {
          break;
        }
      }
    }
    // 斜着走
    if (TILT) {
      if (location % 8 < 7) {
        const location1 = this.canMoveStepsToDirection(
          location + 1,
          2,
          players,
          currentPlayer
        );
        const location2 = this.canMoveStepsToDirection(
          location + 1,
          4,
          players,
          currentPlayer
        );
        if (location1 >= 0) {
          canMoveLocations.push(location1);
        }
        if (location2 >= 0) {
          canMoveLocations.push(location2);
        }
      }
      if (location % 8 > 0) {
        const location1 = this.canMoveStepsToDirection(
          location - 1,
          2,
          players,
          currentPlayer
        );
        const location2 = this.canMoveStepsToDirection(
          location - 1,
          4,
          players,
          currentPlayer
        );
        if (location1 >= 0) {
          canMoveLocations.push(location1);
        }
        if (location2 >= 0) {
          canMoveLocations.push(location2);
        }
      }
    }
    return canMoveLocations;
  }

  public canAttackLocations(
    currentPlayer: Player,
    players: Player[],
    showAllAttackLocations: boolean = false
  ): number[] {
    const { location } = currentPlayer;
    const KNIGHT = this.isKnight(currentPlayer);
    let ATTACK = KNIGHT ? 2 : 1; // 攻击距离
    let TILT = false; // 是否可以斜着攻击
    // 【刃】
    if (this.hasEquipment(currentPlayer, shieldKeyStatusList[0])) {
      TILT = true;
    }
    // 【流星锤】
    if (this.hasEquipment(currentPlayer, "e-1")) {
      ATTACK += 2;
    }
    // 根据以上属性，计算可攻击的位置
    const canAttackLocations: number[] = [];
    // 某个方向是否已攻击，某个方向只能有一个可攻击对象
    const attackDirections = {
      东: false,
      南: false,
      西: false,
      北: false,
    };
    for (let steps = 1; steps <= ATTACK; steps++) {
      if (location % 8 < 8 - steps) {
        const canAttack = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          location + steps
        );
        if (showAllAttackLocations || (!attackDirections["东"] && canAttack)) {
          canAttackLocations.push(location + steps);
          attackDirections["东"] = true;
        }
      }
      if (location % 8 >= steps) {
        const canAttack = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          location - steps
        );
        if (showAllAttackLocations || (!attackDirections["西"] && canAttack)) {
          canAttackLocations.push(location - steps);
          attackDirections["西"] = true;
        }
      }
      if (Math.floor(location / 8) >= steps) {
        const canAttack = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          location - steps * 8
        );
        if (showAllAttackLocations || (!attackDirections["北"] && canAttack)) {
          canAttackLocations.push(location - steps * 8);
          attackDirections["北"] = true;
        }
      }
      if (Math.floor(location / 8) < 8 - steps) {
        const canAttack = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          location + steps * 8
        );
        if (showAllAttackLocations || (!attackDirections["南"] && canAttack)) {
          canAttackLocations.push(location + steps * 8);
          attackDirections["南"] = true;
        }
      }
    }
    // 斜着攻击
    if (TILT) {
      const NotTooRight = location % 8 < 7;
      const NotTooLeft = location % 8 > 0;
      const NotTooTop = Math.floor(location / 8) > 0;
      const NotTooBottom = Math.floor(location / 8) < 7;
      if (NotTooRight && NotTooTop) {
        const attackLocation = location - 7;
        const canAttack = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          attackLocation
        );
        if (showAllAttackLocations || canAttack) {
          canAttackLocations.push(attackLocation);
        }
      }
      if (NotTooRight && NotTooBottom) {
        const attackLocation = location + 9;
        const canAttack = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          attackLocation
        );
        if (showAllAttackLocations || canAttack) {
          canAttackLocations.push(attackLocation);
        }
      }
      if (NotTooLeft && NotTooTop) {
        const attackLocation = location - 9;
        const canAttack = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          attackLocation
        );
        if (showAllAttackLocations || canAttack) {
          canAttackLocations.push(attackLocation);
        }
      }
      if (NotTooLeft && NotTooBottom) {
        const attackLocation = location + 7;
        const canAttack = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          attackLocation
        );
        if (showAllAttackLocations || canAttack) {
          canAttackLocations.push(attackLocation);
        }
      }
    }
    return canAttackLocations;
  }

  public getPlayersWithMoveAttackRange(players: Player[]): Player[] {
    return players.map((player) => {
      const canMoveLocations = this.canMoveLocations(player, players);
      const canAttackLocations = this.canAttackLocations(player, players, true);
      return {
        ...player,
        canMoveLocations,
        canAttackLocations,
      };
    });
  }

  public getCanBeAttackedLocations(
    player: Player,
    players: Player[]
  ): number[] {
    const { index } = player;
    const playersWithRange = this.getPlayersWithMoveAttackRange(players);
    const canBeAttackedLocations = playersWithRange
      .filter((item) => this.isActive(item) && item.index !== index)
      .reduce((res: number[], item) => res.concat(item.canAttackLocations), []);
    return uniq(canBeAttackedLocations);
  }

  // 可以移动，且不会被攻击的位置
  public canMoveSafeLocations(player: Player, players: Player[]): number[] {
    const canBeAttackedLocations = this.getCanBeAttackedLocations(
      player,
      players
    );
    const canMoveLocations = this.canMoveLocations(player, players);
    return canMoveLocations.filter(
      (location) => !canBeAttackedLocations.includes(location)
    );
  }

  // 哪些玩家可以攻击到我
  public getPlayersCanAttackMe(player: Player, players: Player[]): Player[] {
    const { location } = player;
    const playersWithRange = this.getPlayersWithMoveAttackRange(players);
    return playersWithRange.filter((item) => {
      const { canAttackLocations } = item;
      // 没有死亡 && 没有被冰冻 && 能够攻击到我
      return this.isActive(item) && canAttackLocations.includes(location);
    });
  }

  // 我是否可以杀死某个玩家
  public canKillPlayer(
    me: Player,
    player: Player,
    players: Player[],
    canAttack: boolean = true // 玩家还可以攻击的情况下，是否能杀死
  ): boolean {
    const canAttackLocations = this.canAttackLocations(me, players);
    const { magics } = me;
    const { location, equipments } = player;
    // 我无法行动，则直接返回
    if (!this.isActive(me)) return false;
    // 不在攻击范围内，则直接返回
    if (!canAttackLocations.includes(location)) return false;
    const magicCount = magics.length;
    const shieldCount = equipments.filter((item) =>
      this.utils.isEqualProp(item, selectShieldList[1])
    ).length;
    // 玩家可以攻击时，魔法数量 >= 盾的数量时，可以杀死
    if (canAttack) {
      return magicCount >= shieldCount;
    }
    // 否则，必须有一个【冰弹】，且魔法数量 >= 盾的数量+1时，才可以杀死
    else {
      const hasFreeze = this.hasMagic(me, magicFreeze.key);
      return hasFreeze && magicCount >= shieldCount + 1;
    }
  }

  // 判断是否为【叛军骑士】
  public isKnight(player: Player): boolean {
    const { roles } = player;
    return roles.map((prop) => prop.key).includes("r-1");
  }
  // 判断是否为【逃亡者】
  public isEscaper(player: Player): boolean {
    const { roles } = player;
    return !this.isKnight(player) && roles.length > 0;
  }

  // 可行动的玩家：未死亡，未被冰冻
  isActive(player: Player): boolean {
    const { dead } = player;
    return !dead && !this.isFreezed(player);
  }

  public hasEquipment(player: Player, key: string): boolean {
    const { equipments } = player;
    return equipments
      .map((prop) => {
        const { key, status } = prop;
        if (status >= 0) {
          return `${key}/${status}`;
        } else {
          return key;
        }
      })
      .includes(key);
  }

  public hasMagic(player: Player, key: string): boolean {
    const { magics } = player;
    return magics.map((prop) => prop.key).includes(key);
  }

  // 计算按某方向移动一步后的位置 - 撞墙/人检测
  private canMoveStepsToDirection(
    startLocation: number,
    direction: number,
    players: Player[],
    currentPlayer: Player,
    steps = 1
  ) {
    let curLocation;
    let minus;
    let strikePlayer;
    // 移动结果
    let endLocation = -1;
    switch (direction) {
      case 1:
        curLocation = startLocation % 8;
        minus = curLocation + steps - 7;
        strikePlayer = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          startLocation + steps
        );
        if (minus <= 0 && !strikePlayer) {
          endLocation = startLocation + steps;
        }
        break;
      case 2:
        curLocation = Math.floor(startLocation / 8);
        minus = curLocation + steps - 7;
        strikePlayer = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          startLocation + steps * 8
        );
        if (minus <= 0 && !strikePlayer) {
          endLocation = startLocation + steps * 8;
        }
        break;
      case 3:
        curLocation = startLocation % 8;
        minus = curLocation - steps;
        strikePlayer = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          startLocation - steps
        );
        if (minus >= 0 && !strikePlayer) {
          endLocation = startLocation - steps;
        }
        break;
      case 4:
        curLocation = Math.floor(startLocation / 8);
        minus = curLocation - steps;
        strikePlayer = this.checkLocationHasPlayer(
          players,
          currentPlayer,
          startLocation - steps * 8
        );
        if (minus >= 0 && !strikePlayer) {
          endLocation = startLocation - steps * 8;
        }
        break;
    }
    return endLocation;
  }

  // 检查某个卡片是否有其他玩家
  private checkLocationHasPlayer(
    players: Player[],
    currentPlayer: Player,
    endLocation: number
  ) {
    let flag = false;
    const { _id: currentID } = currentPlayer;
    players.forEach((player) => {
      const { location, _id, dead } = player;
      if (dead) return;
      if (location === endLocation && !this.utils.isEqualStr(_id, currentID)) {
        flag = true;
      }
    });
    return flag;
  }

  addIDForSelectShieldList(prop: Prop | undefined): Prop[] {
    if (!prop) return [];
    return selectShieldList.map((item) => {
      const _item = Object.assign({}, item);
      _item.id = prop.id;
      return _item;
    });
  }

  public pickProp(
    player: Player,
    prop: Prop | undefined,
    pickAll: boolean = false // 是否捡起可选装备
  ): Player {
    if (!prop) return player;
    const { key } = prop;
    // prop是非【刃盾】的装备
    if (key.includes("e") && (pickAll || !key.includes("e-2"))) {
      player.equipments.push(prop);
    } else if (key.includes("m")) {
      player.magics.push(prop);
    } else if (key.includes("r")) {
      const { roles } = player;
      const isKnight = roles.some((role) => role.key === "r-1");
      // 若是叛军骑士，则不覆盖角色
      if (isKnight) player.roles.unshift(prop);
      else if (!roles.map((item) => item.key).includes(key)) {
        player.roles.push(prop);
      }
    }
    return player;
  }

  public selectProp(
    selectProps: Prop[],
    status: number,
    player: Player
  ): Player {
    const prop = selectProps[status];
    if (!prop) {
      throw new BadRequestError("参数无效");
    }
    return this.pickProp(player, prop, true);
  }

  public throwProp(prop: Prop, player: Player, type: string): Player {
    const props = player[type] as Prop[];
    const { key, status } = prop;
    const throwIndex = props
      .map((prop) => `${prop.key}/${prop.status}`)
      .indexOf(`${key}/${status}`);
    if (throwIndex < 0) {
      throw new BadRequestError("参数无效");
    }
    props.splice(throwIndex, 1);
    return {
      ...player,
      [type]: props,
    };
  }

  // 更新roundData
  public updateRoundData(
    round: Round,
    prop: Prop | undefined,
    player: Player
  ): Round {
    const { status } = round;
    const { equipments, location } = player;
    if (status === -1) {
      // 若为翻开的道具为【刃盾】
      if (this.isSelectedProp(prop)) {
        return {
          ...round,
          prop,
          endLocation: location,
          status: 0,
          selectProps: this.addIDForSelectShieldList(prop),
        };
      }
      // 若玩家装备数量超过限制
      else if (equipments.length > this.EquipmentMaximum) {
        return {
          ...round,
          prop,
          endLocation: location,
          status: 1,
          throwProps: equipments,
        };
      } else {
        return {
          ...round,
          prop,
          endLocation: location,
          status: 2,
        };
      }
    } else if (status === 0) {
      if (equipments.length > this.EquipmentMaximum) {
        return {
          ...round,
          status: 1,
          throwProps: equipments,
        };
      } else {
        return {
          ...round,
          status: 2,
        };
      }
    } else if (status === 1) {
      return {
        ...round,
        status: 2,
      };
    }
    return round;
  }

  // 判断道具是否为【刃盾】
  private isSelectedProp(prop: Prop | undefined): boolean {
    return !!(prop && prop.key.includes("e-2"));
  }

  // 攻击
  attackPlayerOnLocation(
    location: number,
    players: Player[],
    currentPlayerIndex: number
  ): { players: Player[]; attackDetail: AttackDetail } {
    const player = this.getPlayerByLocation(location, players);
    const attackDetail: AttackDetail = {
      kill: false,
      attackPlayerIndex: -1,
    };
    if (player) {
      const { index } = player;
      attackDetail.attackPlayerIndex = index;
      // 若有盾
      const shield = this.hasEquipment(player, shieldKeyStatusList[1]);
      // 则丢弃一个盾
      if (shield) {
        players[index] = this.throwProp(
          selectShieldList[1],
          player,
          "equipments"
        );
      } else {
        players[index] = {
          ...player,
          dead: true,
        };
        attackDetail.kill = true;
        players[currentPlayerIndex].killSum += 1;
      }
    }
    return {
      players,
      attackDetail,
    };
  }

  public getPlayerByLocation(
    location: number,
    players: Player[]
  ): Player | undefined {
    let targetPlayer;
    players.forEach((player) => {
      const { location: playerLocation } = player;
      if (playerLocation === location) targetPlayer = player;
    });
    return targetPlayer;
  }

  getNextPlayer(
    currentPlayerIndex: number,
    players: Player[]
  ): {
    nextPlayer: Player;
    newPlayers: Player[];
  } {
    const L = players.length;
    let nextPlayerIndex = currentPlayerIndex;
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % L;
      const nextPlayer = players[nextPlayerIndex];
      const { dead } = nextPlayer;
      // 【冰冻】状态
      if (this.isFreezed(nextPlayer)) {
        players[nextPlayerIndex] = this.thaw(nextPlayer);
      }
      // 非【死亡】状态
      else if (!dead) {
        return {
          nextPlayer,
          newPlayers: players,
        };
      }
    } while (nextPlayerIndex !== currentPlayerIndex);

    return {
      nextPlayer: players[currentPlayerIndex],
      newPlayers: players,
    };
  }

  private isFreezed(player: Player) {
    const { status } = player;
    return status.includes(0);
  }

  private thaw(player: Player): Player {
    const { status } = player;
    const newStatus = status.filter((e) => e !== 0);
    return {
      ...player,
      status: newStatus,
    };
  }

  // 判断游戏是否结束
  getWinner(players: Player[]): number {
    // 通过唯一幸存获胜
    const aliveList = players.filter((e) => !e.dead);
    const aliveSum = aliveList.length;
    if (aliveSum === 1) {
      const { index } = aliveList[0];
      return index;
    }
    // 逃亡者，通过走到对角获胜
    for (let i = 0; i < aliveSum; i++) {
      const player = aliveList[i];
      const { location, target, index } = player;
      const isEscaper = this.isEscaper(player);
      if (isEscaper && location === target) {
        return index;
      }
    }
    return -1;
  }

  // 处理players的角色变化
  handlePlayerRoles(
    players: Player[],
    cards: Card[]
  ): { players: Player[]; cards: Card[] } {
    const roleList = players.map((player) => {
      const { dead, roles } = player;
      const L = roles.length;
      if (dead) return "dead";
      else if (L <= 0) return null;
      const role = roles[L - 1].key;
      return role;
    });
    // 任一人角色为叛军骑士
    if (roleList.includes("r-1")) {
      roleList.forEach((role, index) => {
        // 为无角色的玩家，分配女佣角色
        if (!role) {
          players[index].roles.push(maidservantRole);
        }
      });
    }
    // 无人为叛军骑士，且仅有一人无角色
    else if (roleList.filter((e) => !e).length === 1) {
      roleList.forEach((role, index) => {
        // 为无角色的玩家，分配叛军骑士角色
        if (!role) {
          players[index].roles.push(knightRole);
        }
      });
      // 并翻开叛军骑士牌
      cards.forEach((card, index) => {
        const {
          prop: { key },
        } = card;
        if (key === "r-1") {
          cards[index].open = true;
        }
      });
    }

    return {
      players,
      cards,
    };
  }

  public handleMagicAction(
    currentPlayer: Player,
    players: Player[],
    currentPlayerIndex: number,
    magicAction: MagicAction,
    roundData: Round
  ): {
    players: Player[];
    roundData: Round;
  } {
    const { target, magic, targetEquipment } = magicAction;
    const { key } = magic;
    const targetPlayer = players[target];
    // 必须以存活的人为目标
    if (!targetPlayer || targetPlayer.dead) {
      throw new BadRequestError("参数无效");
    }
    // 【缴械】必须有目标装备
    if (key === magicDisarm.key && !targetEquipment) {
      throw new BadRequestError("参数无效");
    }
    // 加入当前回合使用的魔法列表
    roundData.magicActions.push(magicAction);
    // 当前玩家，消耗魔法
    players[currentPlayerIndex] = this.throwProp(
      magic,
      currentPlayer,
      "magics"
    );
    // 【缴械】
    if (key === magicDisarm.key) {
      players[target] = this.throwProp(
        targetEquipment as Prop,
        players[target],
        "equipments"
      );
    }
    // 【冰弹】
    else if (key === magicFreeze.key) {
      players[target].status.push(0);
    }

    return {
      players,
      roundData,
    };
  }

  public handlePlayersOnline(players: Player[], onlineTimeStampMap: any) {
    players.forEach((player) => {
      const { ai } = player;
      const lastOnline = this.getPlayerLastOnline(player, onlineTimeStampMap);
      const online = Date.now() - lastOnline < this.OFFLINE_TIME_LIMIT;
      // AI永远在线
      player.online = ai || online;
      player.automatic = this.isAutomaticPlayer(player, onlineTimeStampMap);
    });
  }

  public getPlayerLastOnline(player: Player, onlineTimeStampMap: any): number {
    const map = new Map(Object.entries(onlineTimeStampMap));
    const { _id } = player;
    const lastOnline = map.get(_id) as number;
    return lastOnline;
  }

  public isAutomaticRound(data: Game): boolean {
    let { roundData, players, onlineTimeStampMap } = data;
    const { player } = roundData;
    const currentPlayer = players[player];
    const { ai } = currentPlayer;

    return ai || this.isAutomaticPlayer(currentPlayer, onlineTimeStampMap);
  }

  public isAutomaticPlayer(player: Player, onlineTimeStampMap: any): boolean {
    const { overtime } = player;
    const lastOnline = this.getPlayerLastOnline(player, onlineTimeStampMap);

    if (overtime && Date.now() - lastOnline > this.AUTOMATIC_TIME_LIMIT) {
      return true;
    }
    return false;
  }

  public calculateDistanceBetweenLocations(
    location1: number,
    location2: number,
    sideLength: number = 8
  ): number {
    const x1 = location1 % sideLength;
    const x2 = location2 % sideLength;
    const y1 = ~~(location1 / sideLength);
    const y2 = ~~(location2 / sideLength);

    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
}
