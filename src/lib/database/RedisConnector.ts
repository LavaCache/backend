import IORedis  from "ioredis";
import Logger from "@ayanaware/logger";

export class RedisConnector {
  /**
   * Logger=
   */
  public logger: Logger;
  /**
   * The redis instance.
   */
  public readonly redis: IORedis.Redis;

  public constructor() {
    this.logger = Logger.get(RedisConnector);
    this.redis = new IORedis({ lazyConnect: true });
  }

  /**
   * Connect to the redis server.
   */
  public async connect() {
    try {
      await this.redis.connect();
    } catch (e) {
      this.logger.error(e);
      return process.exit(1);
    }

    this.logger.info("Now connected to redis");
  }
}