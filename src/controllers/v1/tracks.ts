import { Control, Controller, Use } from "../../lib";
import { Context, Next } from "koa";

@Control("/tracks")
export class Tracks extends Controller {
  public name = "/v1/tracks";

  @Use
  public auth(ctx: Context, next: Next) {
    next();
  }
}
