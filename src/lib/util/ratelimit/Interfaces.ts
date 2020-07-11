import IORedis from "ioredis";

export interface Config {
  partitionKey?: string;
  ratelimit?: number;
  db: IORedis.Redis
  globalEXP?: number;
  timeout?: number;
  cacheSize?: number;
  dbStr?: string;
}

export interface VisitorEntry {
  key: string;
  attrs: VisitorAttrs;
}

export interface VisitorAttrs {
  remaining: number;
  uat: number;
  exp: number;
}

export const GliderKeys = [
  {
    name: 'createKey',
    file: 'create_key',
    key_num: 1,
  },
  {
    name: 'visitKey',
    file: 'visit_key',
    key_num: 1,
  },
];