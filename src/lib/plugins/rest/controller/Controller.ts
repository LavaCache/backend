import { Component } from "@ayanaware/bento";
import Router from "@koa/router";

import { ControllerData, Method } from "./Interfaces";
import LavaCache from "../../../LavaCache";

export default abstract class Controller implements Component {
  public abstract name: string;

  /**
   * The lavacache instance.
   */
  public readonly lc: LavaCache;

  /**
   * Whether this controller is versioned or not.
   */
  public versioned: boolean;
  /**
   * The koa router instance.
   */
  public router: Router;

  /**
   * @param lc
   */
  protected constructor(lc: LavaCache) {
    this.versioned = true;
    this.lc = lc;
  }

  /**
   * Loads all registered routes for the controller.
   * @param data
   * @since 1.0.
   */
  public async loadRoutes(data: ControllerData): Promise<void> {
    const router = (this.router = new Router({ prefix: data.prefix }));
    for (const path in data.routes) {
      const route = data.routes[path];

      (await route.method) === Method.USE
        ? router.use(route.run.bind(this))
        : router[route.method](path, route.run.bind(this));
    }
  }
}
