import BaseService from "@/app/utils/common.base.service";
import { GameModel } from "./game.model";
import { provide, inject } from "midway";

@provide()
export class GameBaseService extends BaseService<Game> {
  constructor(@inject() gameModel: GameModel) {
    super(gameModel.getModel());
  }
}
