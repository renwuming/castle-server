import { provide, Context, config, inject } from "midway";
import { UnauthorizedError } from "egg-errors";

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
        dataType: "json",
        data: { ticket },
      })
      .then((res) => {
        const { status, data } = res;
        if (status >= 400) {
          throw new UnauthorizedError("身份验证失败");
        }
        return data;
      });
    const { _id, userInfo } = userData;
    const { nickName, avatarUrl } = userInfo;
    ctx.state.user = {
      _id,
      nickName,
      avatarUrl,
    };
  }
}
