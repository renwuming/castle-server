import {
  WebMiddleware,
  Middleware,
  provide,
  inject,
  config,
  Context,
} from "midway";
import { UserService } from "src/app/user/user.service";
import { UnauthorizedError } from "egg-errors";

@provide()
export class AuthMiddleware implements WebMiddleware {
  @config()
  autoAuth: boolean;
  @inject()
  userService: UserService;

  public resolve(): Middleware {
    return async (ctx, next) => {
      if (this.autoAuth) {
        this.handleAutoAuthUser(ctx);
        await next();
      } else {
        await this.userService.validate(ctx);
        await next();
      }
    };
  }

  private handleAutoAuthUser(ctx: Context) {
    const ticket = ctx.request.header["x-ticket"];
    if (!ticket) {
      throw new UnauthorizedError("身份验证失败");
    }
    ctx.state.user = {
      _id: `test-id-${ticket}`,
      nickName: `测试账号-${ticket}`,
      avatarUrl:
        "http://thirdwx.qlogo.cn/mmopen/vi_32/95toQN7kMtpJnzVgWHlLbicOb0dsvvicpsc6jNBMV4Yd8fzOwrRRDXYodQstktl9ysic0lK8GBlab5xa1y0lMtaMw/132",
    };
  }
}
