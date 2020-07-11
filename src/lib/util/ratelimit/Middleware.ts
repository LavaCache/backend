import { Logger } from "@ayanaware/logger";
import { Context } from "koa";

import { resolve } from "path";
import { readFileSync } from "fs";
import IORedis from "ioredis";
import Cache from "lru-cache";
import { now } from "microtime";

import { Config, GliderKeys, VisitorAttrs } from "./Interfaces";
import { ipToHex, exists, micro_to_milli } from "../Util";

const logger = Logger.get(ratelimiter);

export async function ratelimiter(opts: Config) {
  opts = Object.assign({
    partitionKey: "glider",
    ratelimit: 1000,
    globalEXP: 60 * 60 * 1000 * 1000, // expiration time in μs
    timeout: 2000,
    cacheSize: 500,
  }, opts)

  const db = opts.db;
  const watcher = new IORedis();

  const bannedKeys: Cache<string, number> = new Cache<string, number>(opts.cacheSize!);
  const localCache: Cache<string, VisitorAttrs> = new Cache<string, VisitorAttrs>(opts.cacheSize!);
  let localQueue: string[][] = [];
  let lastCommitted: number = now();

  /*
   * Init worker (Retrieve banned keys)
   *
   * Note: Since expired keys has been pruned locally when request received,
   *       There"s no need to publish such message to the channel
   */
  await db.multi()
    .zrevrangebyscore(
      `${opts.partitionKey}-ban`,
      "+inf",
      lastCommitted,
      "WITHSCORES"
    )
    .zremrangebyscore(`${opts.partitionKey}-ban`, "+inf", lastCommitted)
    .exec((err, result) => {
      if (err) logger.error(err);
      else {
        const [ key, exp ] = result[0][1];
        const expParse: number = parseInt(exp, 10);
        bannedKeys.set(key, expParse, micro_to_milli(expParse));
      }
    });

  /*
   * Redis-Lua Macros Definitions
   */
  GliderKeys.forEach((macro) => {
    db.defineCommand(macro.name, {
      numberOfKeys: macro.key_num,
      lua: readFileSync(resolve(process.cwd(), "scripts", `${macro.file}.lua`), { encoding: "utf8", }),
    });
  });

  setInterval(async () => {
    const currentTime = now();
    await _write_to_redis();
    lastCommitted = currentTime;
    await _update_local(currentTime);
    await db.ping();
  }, opts.timeout!);

  await watcher.subscribe(
    `${opts.partitionKey}-ban`,
    `${opts.partitionKey}-unban`
  );

  watcher.on("message", (channel: any, message: any) => {
    const [ key, exp ] = message.split(":");
    const expAsInt = parseInt(exp, 10);
    switch (channel) {
      case `${opts.partitionKey}-ban`: {
        if (!bannedKeys.has(key) || bannedKeys.get(key) !== expAsInt) {
          bannedKeys.set(key, expAsInt, micro_to_milli(expAsInt));
          localCache.del(key);
        }

        break;
      }
      case `${opts.partitionKey}-unban`: {
        bannedKeys.del(message);
        if (!localCache.get(key)) {
          localCache.set(
            key,
            {
              exp: expAsInt,
              remaining: opts.ratelimit! - 1,
              uat: expAsInt,
            },
            micro_to_milli(expAsInt)
          );
        }

        break;
      }
    }
  });

  async function _update_local(currentTime: number): Promise<void> {
    const queryTmp = localCache.keys();
    if (queryTmp.length > 0) {
      await db
        .hmget(`${opts.partitionKey}-remaining`, ...queryTmp)
        .then((res) => {
          res.forEach((result: any, index: number) => {
            const cacheUpdateTmp = localCache.get(queryTmp[index]);
            if (exists(cacheUpdateTmp)) {
              localCache.set(
                queryTmp[index],
                {
                  exp: cacheUpdateTmp!.exp,
                  remaining: parseInt(result, 10),
                  uat: currentTime,
                },
                micro_to_milli(cacheUpdateTmp!.exp)
              );
            }
          });
        });
    }
  }

  /**
   * Update localCache with remote response
   */
  async function _write_to_redis(): Promise<void> {
    if (localQueue.length > 0) {
      await db.pipeline(localQueue).exec((err) => {
        if (err) logger.error(err);
      });
      localQueue = [];
    }
  }

  return async (ctx: Context, next: () => Promise<any>) => {
    // Fetching Current Sessions
    const currentTime: number = now();
    const userKey: string = ipToHex(ctx.ip);
    const cacheReg: VisitorAttrs | undefined = localCache.get(userKey);
    const bannedReg: number | undefined = bannedKeys.get(userKey);

    // Responses
    let ratelimited: boolean;
    let currentReg: VisitorAttrs;

    // If the key is banned and expiration time is later than currentTime
    if (bannedReg && currentTime < bannedReg) {
      ratelimited = true;
      currentReg = {
        remaining: 0,
        uat: currentTime,
        exp: bannedReg,
      };
    } else {
      if (cacheReg && currentTime < cacheReg.exp) {
        // If the localCache contains the key and the currentTime(stamp) is not yet expired
        // Decrease the value, or ground the user
        ratelimited = !(cacheReg.remaining > 0);

        // Try to decrease localCache Value
        currentReg = {
          remaining: ratelimited ? 0 : --cacheReg.remaining,
          uat: ratelimited ? cacheReg.uat : currentTime,
          exp: cacheReg.exp,
        };

        localQueue.push([
          "visitKey",
          userKey,
          currentReg.uat.toString(),
          opts.partitionKey!,
        ]);
        if (ratelimited) await _write_to_redis();
      } else {
        // Else, initialize a new token
        ratelimited = false;
        currentReg = {
          remaining: opts.ratelimit! - 1,
          uat: currentTime,
          exp: currentTime + opts.globalEXP!,
        };

        // Only key creation can trigger a redis pipeline directly
        await db
          .pipeline([ [ "createKey", userKey, currentReg.exp.toString(), currentReg.uat.toString(), currentReg.remaining.toString(), opts.partitionKey! ], ])
          .exec((err, res) => {
            if (err) logger.error(err);
            else {
              if (exists(res[0][1][0])) {
                const remoteRemains = parseInt(res[0][1][1], 10);
                const remoteExp = parseInt(res[0][1][0], 10);

                currentReg = {
                  exp: remoteExp,
                  remaining: remoteRemains,
                  uat: currentTime,
                };

                ratelimited = remoteRemains === 0;
              }
            }
          });
      }
    }
    if (!ratelimited) {
      // Update the localCache Value
      localCache.set(userKey, currentReg, micro_to_milli(currentReg.exp));
    } else {
      bannedKeys.set(userKey, currentReg.exp, micro_to_milli(currentReg.exp));
      localCache.del(userKey);
    }

    ctx.set({
      "X-RateLimit-Remaining": currentReg.remaining.toString(),
      "X-RateLimit-Reset": micro_to_milli(currentReg.exp).toString(),
    });

    ratelimited
      ? ctx.throw({
        success: false,
        message: "Slow down!!"
      }, 429)
      : await next();
  };
}