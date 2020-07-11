import { LavaCache, pluck } from "../index";
import { v5 } from "uuid";
import { compareSync, hash } from "bcrypt";
import { Logger } from "@ayanaware/logger";
import LRUCache from "lru-cache";
import { ICollection } from "monk";
import { Context } from "koa";

export class AuthKeyManager {
  /**
   * The lavacache instance
   */
  public readonly lc: LavaCache;
  /**
   * The logger instance.
   */
  public readonly logger: Logger;
  /**
   * The auth key cache.
   */
  public readonly cache: LRUCache<string, User>;

  /**
   * The number of rounds to hash the password with.
   */
  public rounds = 12;


  /**
   * @param lc
   */
  public constructor(lc: LavaCache) {
    this.lc = lc;
    this.logger = Logger.get(AuthKeyManager);
    this.cache = new LRUCache({ maxAge: 6e4 });
  }

  /**
   * Get the auth key db collection.
   */
  public get db(): ICollection<User> {
    return this.lc.mongo.db.get<User>("users");
  }

  /**
   * Generates a password a given user.
   * @param user The user to generate the authorization key for.
   * @param data Extra user data.
   * @since 1.0.0
   */
  public generate(user: string, data: Partial<Omit<User, "password" | "user">> = {}) {
    return new Promise((resolve, reject) => {
      const key = v5(user, process.env.UUID_NAMESPACE);
      return hash(key, this.rounds, async (err, pass) => {
        if (err) {
          this.logger.error(err);
          return reject(err);
        }

        const doc = await this.db.insert({
          user,
          password: pass,
          type: UserType.FREE,
          ips: [],
          ...data
        });

        this.cache.set(key, doc);

        resolve(key);
      })
    });
  }

  /**
   * Check a provided password to see if it's valid.
   * @param provided
   * @since 1.0.0
   */
  public async check(provided: string, ctx?: Context) {
    if (this.cache.has(provided)) {
      const cached = this.cache.get(provided);
      if (ctx && !cached.ips.includes(ctx.ip)) return false;
      else compareSync(provided, cached.password);
    }

    return new Promise(async (res) => {
      (await this.db.find())
        .some(_ => res(compareSync(provided, _.password)));
    });
  }

  /**
   * Fetch a user from the database or cache.
   * @param usernameOrKey The username of the user to get, or their authorization key.
   * @since 1.0.0
   */
  public async fetch(usernameOrKey: string): Promise<Omit<User, "password">> {
    if (this.cache.has(usernameOrKey)) {
      const cached = this.cache.get(usernameOrKey);
      return pluck(cached, ["password"]);
    }

    let found = await this.db.findOne({ user: usernameOrKey });
    if (found) return pluck(found, ["password"]);

    found = (await this.db.find()).find(_ => compareSync(usernameOrKey, _.password));
    if (found) return pluck(found, ["password"]);

    return null;
  }
}

export interface User {
  user: string;
  password: string;
  type: UserType
  ips: string[];
}

export enum UserType {
  FREE,
  BRONZE,
  SILVER,
  GOLD
}

export const plans: Record<UserType, { ips: number, requests: number }> = {
  [UserType.FREE]: { requests: 120, ips: 1 },
  [UserType.BRONZE]: { requests: 250, ips: 1 },
  [UserType.SILVER]: { requests: 500, ips: 2 },
  [UserType.GOLD]: { requests: 1750, ips: 5 },
}
