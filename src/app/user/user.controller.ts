import { Context, controller, inject, post, provide } from "midway";

// import { UserService } from "./user.service";

@provide()
@controller("/users")
export class UserController {
  @inject()
  ctx: Context;
  // @inject()
  // private userService: UserService;
  constructor() {}

  @post("/validate", { middleware: ["authMiddleware", "apiMiddleware"] })
  public async getGames(): Promise<void> {
    this.ctx.body = this.ctx.state.user;
  }
}
