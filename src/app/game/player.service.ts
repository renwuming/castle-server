import { provide, inject } from "midway";
import { selectShieldList } from "@/lib/gameHelper";
import { Utils } from "@/lib/utils";
import { BadRequestError } from "egg-errors";

@provide()
export class PlayerService {
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
    prop: Prop | undefined
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
    if (this.hasEquipment(currentPlayer, "e-2/0")) {
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
        if (!attackDirections["东"] && (showAllAttackLocations || canAttack)) {
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
        if (!attackDirections["西"] && (showAllAttackLocations || canAttack)) {
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
        if (!attackDirections["北"] && (showAllAttackLocations || canAttack)) {
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
        if (!attackDirections["南"] && (showAllAttackLocations || canAttack)) {
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

  // 判断是否为【叛军骑士】
  private isKnight(player: Player): boolean {
    const { roles } = player;
    return roles.map((prop) => prop.key).includes("r-1");
  }

  private hasEquipment(player: Player, key: string): boolean {
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
      else player.roles.push(prop);
    }
    return player;
  }

  public selectProp(status: number, player: Player): Player {
    const prop = selectShieldList[status];
    if (!prop) {
      throw new BadRequestError("参数无效");
    }
    return this.pickProp(player, prop, true);
  }

  public throwProp(prop: Prop, player: Player): Player {
    const { equipments } = player;
    const { key, status } = prop;
    const throwIndex = equipments
      .map((prop) => `${prop.key}/${prop.status}`)
      .indexOf(`${key}/${status}`);
    if (throwIndex < 0) {
      throw new BadRequestError("参数无效");
    }
    equipments.splice(throwIndex, 1);
    return {
      ...player,
      equipments,
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
          selectProps: selectShieldList,
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
  attackPlayerOnLocation(location: number, players: Player[]): Player[] {
    const player = this.getPlayerByLocation(location, players);
    if (player) {
      const { index } = player;
      // 若有盾
      const shield = this.hasEquipment(player, "e-2/1");
      // 则丢弃一个盾
      if (shield) {
        players[index] = this.throwProp(selectShieldList[1], player);
      } else {
        players[index] = {
          ...player,
          dead: true,
        };
      }
    }
    return players;
  }

  getPlayerByLocation(location: number, players: Player[]): Player | undefined {
    let targetPlayer;
    players.forEach((player) => {
      const { location: playerLocation } = player;
      if (playerLocation === location) targetPlayer = player;
    });
    return targetPlayer;
  }

  getNextPlayer(currentPlayerIndex: number, players: Player[]): Player {
    const L = players.length;
    let nextPlayerIndex = currentPlayerIndex;
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % L;
      const nextPlayer = players[nextPlayerIndex];
      const { dead } = nextPlayer;
      if (!dead) return nextPlayer;
    } while (nextPlayerIndex !== currentPlayerIndex);

    return players[currentPlayerIndex];
  }
}
