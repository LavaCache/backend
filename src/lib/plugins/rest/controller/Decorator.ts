import { ControllerData, Method } from "./Interfaces";
import Controller from "./Controller";

const CONTROLLER = Symbol("Controller");

/**
 * Get controller data from a Controller instance.
 * @param controller
 */
export function getController(controller: Controller): ControllerData {
  const data = controller.constructor[CONTROLLER];
  if (data) return data;
  else return null;
}

/**
 * Used for declaring the prefix of a controller.
 * @param prefix
 * @constructor
 */
export function Control(prefix: string): ClassDecorator {
  return (target: any) => {
    target[CONTROLLER].prefix = prefix;
  }
}

/**
 * Used for declaring a controller route.
 * @param path The path of the route.
 * @param method The method used to meet (?) this route
 * @constructor
 */
export function Route(path: string, { method }: { method: Method }): MethodDecorator {
  return (target: any, propertyKey, descriptor) => {
    if (target.prototype !== undefined)
      throw new Error(`Route decorators can only be applied to non-static class properties ("${String(propertyKey)}" in class "${target.name}")`);

    if (!target.constructor[CONTROLLER]) {
      target.constructor[CONTROLLER] = {
        prefix: null,
        routes: {}
      }
    }

    target.constructor[CONTROLLER].routes[path] = {
      method,
      run: descriptor.value
    }
  }
}
