import { Bento, ConfigLoader, FSComponentLoader } from "@ayanaware/bento";
import { join } from "path";

import Sentry from "./plugins/Sentry";
import { definitions } from "./util";
import { REST } from "./plugins/rest";
import { RedisConnector } from "./database/RedisConnector";

export default class LavaCache {
  public readonly bento: Bento;

  public redis: RedisConnector;

  public config = new ConfigLoader();
  public sentry = new Sentry();
  public rest = new REST(this);
  public loader = new FSComponentLoader();

  public constructor() {
    this.bento = new Bento();
    this.redis = new RedisConnector();
  }

  public async configure(): Promise<void> {
    await this.loader.addDirectory(join(process.cwd(), "dist/controllers"));
    await this.config.addDefinitions(definitions);
  }

  public async launch() {
    await this.configure();

    await this.bento.addPlugin(this.config);
    await this.bento.addPlugin(this.sentry);
    await this.bento.addPlugin(this.rest);
    await this.bento.addPlugin(this.loader);

    await this.bento.verify();
  }
}