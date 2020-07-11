import { Plugin, PluginAPI } from "@ayanaware/bento";
import { Logger } from "@ayanaware/logger";

import Koa, { Middleware } from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import body from "koa-body";
import helmet from "koa-helmet";
import morgan from "koa-morgan";

import { ratelimiter } from "../../util";
import LavaCache from "../../LavaCache";
import Controller from "./controller/Controller";
import { getController } from "./controller/Decorator";

export class REST implements Plugin {
  public readonly logger: Logger;
  /**
   * The name of this plugin.
   */
  public readonly name: string;
  /**
   * The koa server.
   */
  public readonly server: Koa;
  /**
   * The lavacache instance.
   */
  public readonly lc: LavaCache;

  /**
   * All loaded controllers.
   */
  public controllers: Map<string, Controller>;
  /**
   * The primary koa router.
   */
  public router: Router;

  /**
   * The api version.
   */
  public version: string = process.env.API_VERSION;
  /**
   * The port to listen on.
   */
  public port: string = process.env.API_PORT;

  /**
   * The REST Plugin for the backend.
   */
  public constructor(lc: LavaCache) {
    this.lc = lc;
    this.server = new Koa();
    this.name = "rest";
    this.logger = Logger.get(REST);
    this.controllers = new Map();
  }

  /**
   * Load middleware
   * @param middleware
   * @since 1.0.0
   */
  public useMiddleware(middleware: Middleware[]) {
    this.logger.debug("Loading Middleware");
    middleware.map((fn) => this.server.use(fn));
    return;
  }

  /**
   * Ran when this plugin has been loaded.
   * @param api
   * @since 1.0.0
   */
  public async onLoad(api?: PluginAPI) {
    this.useMiddleware([
      await ratelimiter({ db: this.lc.redis.redis }),
      cors(),
      body({ json: true }),
      morgan("dev", {
        stream: {
          write: (str: string) => {
            this.logger.info(str.trim());
          }
        }
      }),
      helmet(),
    ]);

    this.server.use((ctx, next) => {
      this.router
        ? this.router.middleware()(ctx as any, next)
        : ctx.status = 503;
    });

    this.server.listen(this.port, () => {
      this.logger.info(`Ready! Serving on 0.0.0.0:${this.port}`);
      return;
    });
  }

  /**
   * Called when a component gets loaded.
   * @param ctr
   * @since 1.0.0
   */
  public async onPreComponentLoad(ctr: Controller) {
    const data = getController(ctr);
    if (!data) return;

    this.controllers.set(ctr.name, ctr);

    await ctr.loadRoutes(data);
    await this.rebuildRouters();

  }

  /**
   * Rebuilds the primary koa router.
   * @since 1.0.0
   */
  public async rebuildRouters() {
    const versioned = new Router({ prefix: `/v${this.version}` }),
      main = new Router();

    for (const [ , ctr ] of this.controllers) {
      ctr.versioned
        ? versioned.use(ctr.router.routes())
        : main.use(ctr.router.routes())
    }

    main.use(versioned.routes());
    this.router = main;
  }
}