import "dotenv/config";
import { Logger } from "@ayanaware/logger";

import { LavaCache } from "./lib";

const logger = Logger.get();

(async () => {
  await new LavaCache()
    .launch();
})().catch((e) => {
  logger.error(e);
});

