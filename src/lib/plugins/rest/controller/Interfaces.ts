export enum Method {
  GET = "get",
  POST = "post",
  DELETE = "delete",
  PUT = "put",
  PATCH = "patch",
  HEAD = "head",
  USE = "use"
}

export interface ControllerData {
  prefix: string | null;
  routes: Record<string, ControllerRoute>;
}

export interface ControllerRoute {
  method: Method;
  run: Function;
}
