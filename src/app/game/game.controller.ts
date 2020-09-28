import { Context, controller, get, provide, post, inject } from "midway";
import { GameService } from "./game.service";

@provide()
@controller("/games")
export class GameController {
  @inject()
  ctx: Context;
  @inject()
  private gameService: GameService;
  constructor() {}

  @post("/", { middleware: ["authMiddleware", "apiMiddleware"] })
  public async createGame(): Promise<void> {
    this.ctx.body = await this.gameService.createGame();
  }

  @get("/:id", { middleware: ["authMiddleware", "apiMiddleware"] })
  public async getGame(): Promise<void> {
    const { id } = this.ctx.params;
    this.ctx.body = await this.gameService.getGame(id);
  }

  // 加入game
  @post("/:id/join", { middleware: ["authMiddleware", "apiMiddleware"] })
  public async joinGame(): Promise<void> {
    const { id } = this.ctx.params;
    await this.gameService.joinGame(id);
    this.ctx.body = {};
  }

  @post("/:id/start", { middleware: ["authMiddleware", "apiMiddleware"] })
  public async startGame(): Promise<void> {
    const { id } = this.ctx.params;
    await this.gameService.startGame(id);
    this.ctx.body = {};
  }

  // 玩家走棋
  @post("/:id", { middleware: ["authMiddleware", "apiMiddleware"] })
  public async updateGame(): Promise<void> {
    const { id } = this.ctx.params;
    const round: Round = this.ctx.request.body;
    this.ctx.body = await this.gameService.updateGame(id, round);
  }
}
