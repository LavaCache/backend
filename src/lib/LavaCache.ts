import { Bento, ConfigLoader, FSComponentLoader } from "@ayanaware/bento";
import { join } from "path";

import Sentry from "./plugins/Sentry";
import { REST } from "./plugins/rest";
import { definitions } from "./util";
import { RedisConnector } from "./database/RedisConnector";
import { MongoDBConnector } from "./database/MongoDBConnector";
import { AuthKeyManager } from "./util/UserManager";

export default class LavaCache {
  /**
   * The bento instance.
   */
  public readonly bento: Bento;
  /**
   * The authorization key manager.
   */
  public readonly auth: AuthKeyManager;

  /**
   * A redis connector.
   */
  public redis: RedisConnector;
  /**
   * A mongodb connector.
   */
  public mongo: MongoDBConnector;

  // Bento Plugins
  public config = new ConfigLoader();
  public sentry = new Sentry();
  public rest = new REST(this);
  public loader = new FSComponentLoader();

  public constructor() {
    this.bento = new Bento();
    this.auth = new AuthKeyManager(this);

    this.redis = new RedisConnector();
    this.mongo = new MongoDBConnector(this);
  }

  /**
   * Launch the lavacache backend.
   * @since 1.0.0
   */
  public async launch() {
    await this.configure();

    await this.bento.addPlugin(this.config);
    await this.bento.addPlugin(this.sentry);
    await this.bento.addPlugin(this.rest);
    await this.bento.addPlugin(this.loader);

    await this.bento.verify();
  }

  /**
   * Configure the bento plugins.
   * @since 1.0.0
   */
  private async configure(): Promise<void> {
    await this.loader.addDirectory(join(process.cwd(), "dist/controllers"));
    await this.config.addDefinitions(definitions);
  }
}