import { provide, inject } from "midway";
import { selectShieldList } from "@/lib/gameHelper";
import { Utils } from "@/lib/utils";

@provide()
export class MoveService {
  @inject()
  utils: Utils;

  // 打开卡片
  public openCard(cards: Card[], location: number): Partial<Round> {
    const card = cards[location];
    const { open, prop } = card;
    // 已打开的卡片，直接返回
    if (open) return {};
    const { key } = prop;
    // 如果是【刃盾】
    if (key.includes("e-2")) {
      return {
        prop,
        selectProps: selectShieldList,
      };
    } else {
      return {
        prop,
      };
    }
  }
  // 移动
  public move(
    currentPlayer: Player,
    players: Player[],
    targetLocation: number,
    prop: Prop | undefined
  ): number {
    // 如果未翻开道具，或道具不是【陷阱】
    if (!prop) return targetLocation;
    const { key, status } = prop;
    if (!key.includes("d")) return targetLocation;
    else {
      let direction = +key.split("-")[1];
      let endLocation = targetLocation;
      for (let i = 0; i < status; i++) {
        endLocation = this.canMoveTo(
          endLocation,
          direction,
          players,
          currentPlayer
        );
        // 若撞墙/撞人，则调转方向
        if (endLocation < 0) {
          direction = direction <= 2 ? direction + 2 : direction - 2;
          endLocation = this.canMoveTo(
            endLocation,
            direction,
            players,
            currentPlayer
          );
          // 若调转方向也不行，说明无法移动
          if (endLocation < 0) {
            return targetLocation;
          }
        }
      }
      return endLocation;
    }
  }

  // 计算按某方向移动一步后的位置 - 撞墙/人检测
  private canMoveTo(
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

  public playerAddProp(player: Player, prop: Prop) {
    const { key } = prop;
    if (key.includes("e")) {
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
  }

  // 更新roundData
  public updateRoundData(round: Round, player: Player) {
    const { selectProps, status } = round;
    const { equipments } = player;
    // 没有翻出【刃盾】，且装备总数<4
    if (!selectProps && equipments.length < 4) {
      round.status = 2;
    }
    if (status === -1) {
      if (selectProps) round.status = 0;
      else if (equipments.length >= 4) {
        round.status = 1;
        round.selectProps = equipments;
      }
    } else if (status === 0 && equipments.length >= 4) {
      round.status = 1;
      round.selectProps = equipments;
    }
    return round;
  }
}
