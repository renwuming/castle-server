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

  @get("/", { middleware: ["authMiddleware", "apiMiddleware"] })
  public async getGames(): Promise<void> {
    const { skip, end } = this.ctx.query;
    this.ctx.body = await this.gameService.getGames(+skip, Boolean(end));
  }

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

  // 离开game
  @post("/:id/leave", { middleware: ["authMiddleware", "apiMiddleware"] })
  public async leaveGame(): Promise<void> {
    const { id } = this.ctx.params;
    await this.gameService.leaveGame(id);
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

  // 历史成就
  @get("/history/achievements", {
    middleware: ["authMiddleware", "apiMiddleware"],
  })
  public async getAchievements(): Promise<void> {
    const { _id } = this.ctx.state.user;
    this.ctx.body = await this.gameService.getAchievements(_id);
  }
  // 获取某玩家的历史成就
  @get("/history/achievements/:id", {
    middleware: ["authMiddleware", "apiMiddleware"],
  })
  public async getAchievementsByID(): Promise<void> {
    const { id } = this.ctx.params;
    this.ctx.body = await this.gameService.getAchievements(id);
  }
}
