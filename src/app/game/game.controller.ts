import { Context, controller, get, provide, post, inject } from "midway";
import { GameService } from "./game.service";

@provide()
@controller("/game")
export class GameController {
  @inject() private gameService: GameService;
  constructor() {}

  @post("/", { middleware: ["apiMiddleware"] })
  public async createGame(ctx: Context): Promise<void> {
    ctx.body = await this.gameService.createGame();
  }

  @get("/:id")
  public async getGame(ctx: Context): Promise<void> {
    ctx.body = "OK";
  }
}
