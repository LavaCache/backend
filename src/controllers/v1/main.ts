import { Controller, Method, Route } from "../../lib/plugins/rest";
import { Context } from "koa";

export class v1Main extends Controller {
  public name = "/v1";

  @Route("/", { method: Method.GET })
  public getV1Main(ctx: Context) {
    ctx.body = {
      message: "Welcome to version 1 of the lavacache api."
    }
  }

  @Route("/@me", { method: Method.GET })
  public getMe(ctx: Context) {

  }
}
