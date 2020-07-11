import { Plugin, PluginAPI, Variable } from "@ayanaware/bento";
import { Logger } from "@ayanaware/logger";
import * as sentry from "@sentry/node";

import { Config } from "../util";

export default class Sentry implements Plugin {
  public readonly logger: Logger = Logger.get(Sentry);
  public readonly name: string = "sentry";


  @Variable({ name: Config.SENTRY_DSN })
  public dsn: string;

  public async onLoad(api?: PluginAPI) {
    if (!this.dsn) {
      this.logger.warn("No Sentry DSN Provided");
      return;
    }

    sentry.init({ dsn: this.dsn });
    this.logger.info("Sentry Initialized.");
  }
}