import { Context } from "koa";
import { Control, Controller, Method, Route } from "../lib/";

export class MainController extends Controller {
  public name = "main";
  public versioned = false;

  @Route("/", { method: Method.GET })
  public get(ctx: Context) {
    ctx.body = {
      message: "Hello Everyone!"
    }
  }
}