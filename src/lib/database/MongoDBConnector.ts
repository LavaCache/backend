import monk, { IMonkManager } from "monk";
import { LavaCache } from "../index";

export class MongoDBConnector {
  /**
   * The monk instance.
   */
  public readonly db: IMonkManager;
  /**
   * The lavacache instance.
   */
  public readonly lc: LavaCache;

  /**
   * @param lc
   */
  public constructor(lc: LavaCache) {
    this.db = monk("localhost/lc");
    this.lc = lc;
  }
}