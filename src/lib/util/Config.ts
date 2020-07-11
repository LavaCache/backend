import { ConfigBuilder, ConfigDefinitionType } from "@ayanaware/bento";

export enum Config {
  SENTRY_DSN = "sentryDsn",
  API_VERSION = "apiVersion",
  API_PORT = "apiPort",
}

const builder = new ConfigBuilder();
for (const key of Object.keys(Config)) {
  builder.add(Config[key], {
    env: key,
    type: ConfigDefinitionType.STRING,
  });
}

export default builder.build();