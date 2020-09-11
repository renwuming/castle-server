import { provide, Context, config, inject } from "midway";
import { UnauthorizedError } from "egg-errors";

import { GetUserOpts, UserInfo } from "./user.model";

@provide()
export class UserService {
  @inject()
  ctx: Context;
  @config()
  authBaseUrl: string;

  public async validate(ctx: Context = this.ctx): Promise<void> {
    const ticket = ctx.request.header["x-ticket"];
    const userData = await ctx
      .curl(this.authBaseUrl, {
        type: "POST",
        data: { ticket },
      })
      .then((res) => {
        const { status } = res;
        if (status >= 400) {
          throw new UnauthorizedError("身份验证失败");
        }
      });
    ctx.state.user = userData;
  }

  /**
   * 读取用户信息
   */
  public async getUser(options: GetUserOpts): Promise<UserInfo> {
    return {
      id: options.id,
      user_name: "mockedName",
      phone: "12345678901",
      email: "xxx.xxx@xxx.com",
    };
  }
}
