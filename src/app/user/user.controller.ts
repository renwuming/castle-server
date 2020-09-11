import { Context, controller, get, inject, provide } from "midway";

import { UserService } from "./user.service";

@provide()
@controller("/user")
export class UserController {
  @inject()
  ctx: Context;
  @inject()
  private userService: UserService;
  constructor() {}

  @get("/:id")
  public async getUser(): Promise<void> {
    const id = +this.ctx.params.id;
    const user = await this.userService.getUser({ id });

    await this.userService.validate();

    this.ctx.body = {
      success: true,
      message: "OK",
      data: user,
    };
  }
}
