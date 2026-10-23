/**
 * Workers-safe replacement for the `depd` package (aliased in vite.config.ts).
 *
 * depd builds arity-preserving wrappers with `new Function(...)` when a module loads, which the
 * Workers runtime forbids ("Code generation from strings disallowed"). The Lit/Vincent SDK calls
 * it at import time. This keeps the API and warns once per message, without code generation.
 */
"use strict";

function depd(namespace) {
  if (!namespace) throw new TypeError("argument namespace is required");
  const warned = new Set();
  const warn = message => {
    if (warned.has(message)) return;
    warned.add(message);
    console.warn(`${namespace} deprecated ${message}`);
  };

  function deprecate(message) {
    warn(String(message));
  }

  deprecate._namespace = namespace;
  deprecate._ignored = false;
  deprecate._traced = false;
  deprecate._warned = Object.create(null);

  deprecate.function = function wrapfunction(fn, message) {
    if (typeof fn !== "function") throw new TypeError("argument fn must be a function");
    const text = message || `${fn.name || "<anonymous>"}()`;
    return function deprecatedFunction(...args) {
      warn(text);
      return fn.apply(this, args);
    };
  };

  deprecate.property = function wrapproperty(obj, prop, message) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (!descriptor || !descriptor.configurable) return;
    const text = message || `${String(prop)} property`;
    let value = descriptor.value;
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() {
        warn(text);
        return descriptor.get ? descriptor.get.call(this) : value;
      },
      set(next) {
        warn(text);
        if (descriptor.set) descriptor.set.call(this, next);
        else value = next;
      },
    });
  };

  return deprecate;
}

module.exports = depd;
