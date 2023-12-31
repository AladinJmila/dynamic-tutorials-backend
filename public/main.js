/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 553:
/***/ (function(module) {

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function define(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return obj[key];
  }
  try {
    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
    define({}, "");
  } catch (err) {
    define = function(obj, key, value) {
      return obj[key] = value;
    };
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  define(Gp, "constructor", GeneratorFunctionPrototype);
  define(GeneratorFunctionPrototype, "constructor", GeneratorFunction);
  GeneratorFunction.displayName = define(
    GeneratorFunctionPrototype,
    toStringTagSymbol,
    "GeneratorFunction"
  );

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      define(prototype, method, function(arg) {
        return this._invoke(method, arg);
      });
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      define(genFun, toStringTagSymbol, "GeneratorFunction");
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  });
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  define(Gp, toStringTagSymbol, "Generator");

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  define(Gp, iteratorSymbol, function() {
    return this;
  });

  define(Gp, "toString", function() {
    return "[object Generator]";
  });

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   true ? module.exports : 0
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, in modern engines
  // we can explicitly access globalThis. In older engines we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  if (typeof globalThis === "object") {
    globalThis.regeneratorRuntime = runtime;
  } else {
    Function("r", "regeneratorRuntime = r")(runtime);
  }
}


/***/ }),

/***/ 757:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__(553);


/***/ }),

/***/ 769:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(81);
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(645);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_styles_customAudio_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(802);
// Imports



var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
___CSS_LOADER_EXPORT___.i(_node_modules_css_loader_dist_cjs_js_styles_customAudio_css__WEBPACK_IMPORTED_MODULE_2__/* ["default"] */ .Z);
// Module
___CSS_LOADER_EXPORT___.push([module.id, ":root {\r\n  --tone-1: #f0f6fc;\r\n  --tone-2t: rgba(240,246,252,0.58039);\r\n  --tone-3: #7d8794;\r\n  --tone-4: #535b64;\r\n  --tone-5: #161b22;\r\n  --tone-5t: rgba(22,27,34,0.55294);\r\n  --orange-1: #f9d17c;\r\n}\r\n\r\nhtml {\r\n  overflow: hidden;\r\n}\r\n\r\nbody {\r\n  background-color: #0d1117;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  font-size: 13px;\r\n  -webkit-box-sizing: border-box;\r\n          box-sizing: border-box;\r\n}\r\n\r\n.fa {\r\n  cursor: pointer;\r\n}\r\n\r\n/* Navbar Styles */\r\n.navbar {\r\n  display: grid;\r\n  grid-template-columns: 2fr 10fr 2fr;\r\n  background-color: #161b22;\r\n  background-color: var(--tone-5);\r\n  width: 100%;\r\n  height: 70px;\r\n  border-bottom: #535b64 solid 2px;\r\n  border-bottom: var(--tone-4) solid 2px;\r\n  padding: 0 30px;\r\n  font-size: 1.5em;\r\n}\r\n\r\n.brand {\r\n  border: none;\r\n  background-color: transparent;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  padding: 0;\r\n  text-decoration: none;\r\n}\r\n\r\n.brand:hover {\r\n  color: inherit;\r\n}\r\n\r\n.navbar ul {\r\n  list-style-type: none;\r\n  margin: 0;\r\n  padding: 0;\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-pack: right;\r\n      -ms-flex-pack: right;\r\n          justify-content: right;\r\n}\r\n\r\n.navbar li {\r\n  margin-left: 30px;\r\n  cursor: pointer;\r\n  border-bottom: 3px solid transparent;\r\n  -webkit-transition: all 0.2s ease-in;\r\n  transition: all 0.2s ease-in;\r\n}\r\n\r\n.navbar li:hover {\r\n  border-bottom: 3px solid #f0f6fc;\r\n  border-bottom: 3px solid var(--tone-1);\r\n}\r\n\r\n.navbar li.active {\r\n  border-bottom: 3px solid #f0f6fc;\r\n  border-bottom: 3px solid var(--tone-1);\r\n}\r\n\r\n/* Home Styles */\r\n.tutorials-container {\r\n  padding: 80px;\r\n  width: 100%;\r\n  display: grid;\r\n  grid-template-columns: repeat(6, 1fr);\r\n  grid-template-rows: 260px;\r\n  grid-gap: 40px;\r\n  gap: 40px;\r\n  justify-items: center;\r\n  overflow: auto;\r\n}\r\n\r\n.tutorial-progress {\r\n  position: relative;\r\n  width: 230px;\r\n  height: 230px;\r\n  border-radius: 50%;\r\n  background: conic-gradient(\r\n    /* #8b949e 0%, */ /* #8b949e 60%, */ #1f242c 0%,\r\n    #1f242c 100%\r\n  );\r\n  cursor: pointer;\r\n}\r\n\r\n.tutorial-progress:hover {\r\n  -webkit-box-shadow: 0 0 20px 5px rgba(240,246,252,0.58039);\r\n          box-shadow: 0 0 20px 5px rgba(240,246,252,0.58039);\r\n  -webkit-box-shadow: 0 0 20px 5px var(--tone-2t);\r\n          box-shadow: 0 0 20px 5px var(--tone-2t);\r\n}\r\n\r\n.tutorial-progress::after {\r\n  content: '';\r\n  position: absolute;\r\n  width: 230px;\r\n  height: 230px;\r\n  border-radius: 50%;\r\n  top: 0px;\r\n  left: 0px;\r\n  border: #2b333e solid 2px;\r\n  z-index: 0;\r\n}\r\n\r\n.tutorial {\r\n  position: relative;\r\n  width: 210px;\r\n  height: 210px;\r\n  border-radius: 50%;\r\n  top: 10px;\r\n  left: 10px;\r\n  background-color: #161b22;\r\n  background-color: var(--tone-5);\r\n  border: #0d1117 solid 15px;\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  text-align: center;\r\n  padding: 10px;\r\n}\r\n\r\n.tutorial::after {\r\n  content: '';\r\n  position: absolute;\r\n  width: 180px;\r\n  height: 180px;\r\n  border-radius: 50%;\r\n  top: 0px;\r\n  left: 0px;\r\n  border: #2b333e solid 2px;\r\n  z-index: 0;\r\n}\r\n\r\n.tutorial-title {\r\n  letter-spacing: 4;\r\n  font-size: 1.8em;\r\n  /* text-overflow: ellipsis; */\r\n  /* overflow: hidden; */\r\n  /* max-height: 90px; */\r\n  /* white-space: nowrap; */\r\n}\r\n\r\n.tutorial-add {\r\n  position: relative;\r\n  width: 200px;\r\n  height: 200px;\r\n  border-radius: 50%;\r\n  top: 10px;\r\n  left: 10px;\r\n  border: #2b333e dashed 3px;\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  text-align: center;\r\n  cursor: pointer;\r\n}\r\n\r\n.tuto-add-container {\r\n  background-color: #7d8794;\r\n  background-color: var(--tone-3);\r\n}\r\n\r\n.title-container {\r\n  position: relative;\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  /* z-index: 100; */\r\n  width: 100%;\r\n  height: 100%;\r\n}\r\n\r\n.title-container textarea {\r\n  position: absolute;\r\n  top: 40px;\r\n  left: 0;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  border: none;\r\n  text-align: center;\r\n  letter-spacing: 4;\r\n  font-size: 1.8em;\r\n  width: 160px;\r\n  background-color: #161b22;\r\n  background-color: var(--tone-5);\r\n  /* width: 100%; */\r\n  /* height: 100%; */\r\n  /* z-index: 1000; */\r\n  resize: none;\r\n  outline: none;\r\n}\r\n\r\n.title-container textarea::-webkit-input-placeholder {\r\n  text-align: center;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.title-container textarea::-moz-placeholder {\r\n  text-align: center;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.title-container textarea:-ms-input-placeholder {\r\n  text-align: center;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.title-container textarea::-ms-input-placeholder {\r\n  text-align: center;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.title-container textarea::placeholder {\r\n  text-align: center;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.title-container textarea::-webkit-scrollbar {\r\n  display: none;\r\n}\r\n\r\n.tutorial-add:hover {\r\n  -webkit-box-shadow: 0 0 20px 5px rgba(240,246,252,0.58039);\r\n          box-shadow: 0 0 20px 5px rgba(240,246,252,0.58039);\r\n  -webkit-box-shadow: 0 0 20px 5px var(--tone-2t);\r\n          box-shadow: 0 0 20px 5px var(--tone-2t);\r\n}\r\n\r\n.tutorial-add::before {\r\n  content: '';\r\n  width: 120px;\r\n  border-top: 6px #8b949e solid;\r\n  -webkit-transform: translate(2px, -3px);\r\n          transform: translate(2px, -3px);\r\n}\r\n\r\n.tutorial-add::after {\r\n  content: '';\r\n  height: 120px;\r\n  border-left: 6px #8b949e solid;\r\n  -webkit-transform: translateX(-61px);\r\n          transform: translateX(-61px);\r\n}\r\n\r\n/* Viewer Styles */\r\n.content {\r\n  display: grid;\r\n  grid-template-columns: 2fr 8fr 2fr;\r\n  height: 100%;\r\n}\r\n\r\n.groups {\r\n  background-color: #161b22;\r\n  background-color: var(--tone-5);\r\n  min-width: 250px;\r\n  height: 100%;\r\n  border-right: #535b64 solid 2px;\r\n  border-right: var(--tone-4) solid 2px;\r\n  padding: 16px;\r\n}\r\n\r\n.app-xref {\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  height: 68px;\r\n  -webkit-box-pack: space-evenly;\r\n      -ms-flex-pack: space-evenly;\r\n          justify-content: space-evenly;\r\n  margin-bottom: 20px;\r\n  border-bottom: 1px solid #535b64;\r\n  border-bottom: 1px solid var(--tone-4);\r\n  cursor: pointer;\r\n  text-decoration: none;\r\n}\r\n\r\n.app-name {\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  font-size: 1.2em;\r\n  max-width: 100px;\r\n  text-align: center;\r\n}\r\n\r\n.app-xref p {\r\n  font-size: 0.9em;\r\n  width: 50px;\r\n  height: 50px;\r\n  margin-left: 10px;\r\n  padding: 4px;\r\n  display: block;\r\n  color: #7d8794;\r\n  color: var(--tone-3);\r\n  border: 2px dashed #7d8794;\r\n  border: 2px dashed var(--tone-3);\r\n  line-height: 1;\r\n  text-align: center;\r\n  letter-spacing: 2;\r\n}\r\n\r\n/* Groups Navigation */\r\n.groups-collection {\r\n  height: 80vh;\r\n  overflow-y: auto;\r\n  direction: rtl;\r\n}\r\n\r\n.groups-nav {\r\n  padding-left: 5px;\r\n  margin-bottom: 10px;\r\n  direction: ltr;\r\n}\r\n\r\n.groups-nav a {\r\n  text-decoration: none;\r\n  display: block;\r\n  border: none;\r\n  background: none;\r\n  color: #7d8794;\r\n  color: var(--tone-3);\r\n  font-size: 1.4em;\r\n  width: 100%;\r\n  text-align: left;\r\n  cursor: pointer;\r\n  outline: none;\r\n  padding-left: 10px;\r\n}\r\n\r\n.dropdown-btn {\r\n  display: block;\r\n  border: none;\r\n  background: none;\r\n  color: #7d8794;\r\n  color: var(--tone-3);\r\n  font-size: 1.4em;\r\n  width: 100%;\r\n  text-align: left;\r\n  cursor: pointer;\r\n  outline: none;\r\n  border-bottom: 1px solid #535b64;\r\n  border-bottom: 1px solid var(--tone-4);\r\n  text-overflow: ellipsis;\r\n  white-space: nowrap;\r\n  overflow: hidden;\r\n  position: relative;\r\n  padding-right: 20px;\r\n}\r\n\r\n.dropdown-btn > i {\r\n  position: absolute;\r\n  right: 6px;\r\n  top: 6px;\r\n  display: none;\r\n}\r\n\r\n.dropdown-btn.dropdown > i {\r\n  display: block;\r\n}\r\n\r\n.groups-nav a:hover,\r\n.dropdown-btn:hover {\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n}\r\n\r\n.dropdown-container {\r\n  display: none;\r\n}\r\n\r\n.dropdown-btn.active {\r\n  color: #161b22;\r\n  color: var(--tone-5);\r\n  background-color: #f0f6fc;\r\n  background-color: var(--tone-1);\r\n}\r\n\r\n.dropdown-btn.active:hover {\r\n  color: #161b22;\r\n  color: var(--tone-5);\r\n}\r\n\r\n.features {\r\n  background-color: #161b22;\r\n  background-color: var(--tone-5);\r\n  min-width: 250px;\r\n  height: 100%;\r\n  border-left: #535b64 solid 2px;\r\n  border-left: var(--tone-4) solid 2px;\r\n  padding: 16px;\r\n}\r\n\r\n.groups h5,\r\n.features h5 {\r\n  text-align: center;\r\n  margin-bottom: 16px;\r\n}\r\n\r\n.features-count {\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  height: 68px;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  -webkit-box-pack: space-evenly;\r\n      -ms-flex-pack: space-evenly;\r\n          justify-content: space-evenly;\r\n  margin-bottom: 20px;\r\n  border-bottom: 1px solid #535b64;\r\n  border-bottom: 1px solid var(--tone-4);\r\n}\r\n\r\n.features-count p {\r\n  margin: 0;\r\n  font-size: 1.2em;\r\n  display: block;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  text-align: center;\r\n  letter-spacing: 2;\r\n  -webkit-transform: translateY(-8px);\r\n          transform: translateY(-8px);\r\n}\r\n\r\n.features-count p:nth-child(2) {\r\n  font-size: 1em;\r\n  color: #7d8794;\r\n  color: var(--tone-3);\r\n}\r\n\r\n.features-collection {\r\n  display: none;\r\n  -webkit-box-orient: vertical;\r\n  -webkit-box-direction: normal;\r\n      -ms-flex-direction: column;\r\n          flex-direction: column;\r\n}\r\n\r\n.feature-btn {\r\n  margin-bottom: 10px;\r\n  min-height: 32px;\r\n  font-size: 1.2em;\r\n  color: #7d8794;\r\n  color: var(--tone-3);\r\n  border: 1px solid #7d8794;\r\n  border: 1px solid var(--tone-3);\r\n  background-color: transparent;\r\n}\r\n\r\n.feature-btn:last-of-type {\r\n  margin-bottom: 0px;\r\n}\r\n\r\n.feature-btn:hover {\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n}\r\n\r\n.feature-btn.active {\r\n  color: #161b22;\r\n  color: var(--tone-5);\r\n  background-color: #f0f6fc;\r\n  background-color: var(--tone-1);\r\n}\r\n\r\n.feature-btn.active:hover {\r\n  color: #161b22;\r\n  color: var(--tone-5);\r\n}\r\n\r\n#add-feature-note {\r\n  margin-top: 8px;\r\n  color: #f9d17c;\r\n  color: var(--orange-1);\r\n  text-align: center;\r\n  display: none;\r\n}\r\n#add-feature-note.show {\r\n  display: block;\r\n}\r\n\r\n/* Common Navigation Styles */\r\n.add-group-feature {\r\n  display: none;\r\n  border: 2px dashed #7d8794;\r\n  border: 2px dashed var(--tone-3);\r\n  padding: 4px;\r\n  margin-top: 24px;\r\n  direction: ltr;\r\n}\r\n\r\n.group-feature-name {\r\n  background-color: transparent;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  border: none;\r\n  width: 100%;\r\n  border-right: 1px solid #7d8794;\r\n  border-right: 1px solid var(--tone-3);\r\n  margin-right: 4px;\r\n  font-size: 1.2em;\r\n}\r\n\r\n.group-feature-name::-webkit-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.group-feature-name::-moz-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.group-feature-name:-ms-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.group-feature-name::-ms-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.group-feature-name::placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n\r\n.add-group-feature-btn {\r\n  border: none;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  background-color: transparent;\r\n}\r\n\r\n/* Slides Viewer */\r\n.slides-viewer {\r\n  position: relative;\r\n  width: 100%;\r\n  height: 100%;\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-orient: vertical;\r\n  -webkit-box-direction: normal;\r\n      -ms-flex-direction: column;\r\n          flex-direction: column;\r\n  -webkit-box-pack: justify;\r\n      -ms-flex-pack: justify;\r\n          justify-content: space-between;\r\n}\r\n\r\n/* Slides Header */\r\n.slides-header {\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  background-color: #161b22;\r\n  background-color: var(--tone-5);\r\n  min-height: 57px;\r\n  padding: 0 10px;\r\n}\r\n\r\n.slides-progress {\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-sizing: border-box;\r\n          box-sizing: border-box;\r\n  width: 100%;\r\n  height: 56px;\r\n  padding: 18px;\r\n  cursor: pointer;\r\n}\r\n\r\n.progress-frag {\r\n  width: 100%;\r\n}\r\n\r\n.progress-bar {\r\n  background-color: transparent;\r\n  -webkit-transform: translateY(8px);\r\n          transform: translateY(8px);\r\n  border-bottom: 3px dashed #7d8794;\r\n  border-bottom: 3px dashed var(--tone-3);\r\n  position: relative;\r\n}\r\n/* .progress-bar:after {\r\n  content: '';\r\n  position: absolute;\r\n  display: block;\r\n  height: 3px;\r\n  background-color: #ff7930;\r\n  z-index: 10;\r\n  top: 0;\r\n  right: 0;\r\n} */\r\n\r\n.progress-frag:first-of-type::before {\r\n  content: '';\r\n  position: absolute;\r\n  top: 16px;\r\n  height: 24px;\r\n  width: 4px;\r\n  background-color: #f9d17c;\r\n  background-color: var(--orange-1);\r\n  z-index: 5;\r\n}\r\n\r\n.progress-disc {\r\n  width: 24px;\r\n  height: 24px;\r\n  border-radius: 50%;\r\n  background-color: #39404b;\r\n  float: right;\r\n  -webkit-transform: translateY(-6px);\r\n          transform: translateY(-6px);\r\n}\r\n\r\n/* .progress-frag:last-of-type .progress-disc {\r\n  background-color: #45a369;\r\n} */\r\n\r\n/* .progress-frag.active .progress-bar, */\r\n.progress-frag.active .progress-disc {\r\n  /* background-color: #8b949e; */\r\n  outline: 3px solid #8b949e;\r\n  outline-offset: 4px;\r\n}\r\n\r\n.progress-frag.viewed .progress-bar,\r\n.progress-frag.viewed .progress-disc {\r\n  background-color: #f9d17c;\r\n  background-color: var(--orange-1);\r\n}\r\n\r\n.add-slide,\r\n.add-existing-feature {\r\n  position: relative;\r\n  display: none;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n}\r\n\r\n.inheader-slide-id,\r\n.existing-feature-id {\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  background-color: rgba(22,27,34,0.55294);\r\n  background-color: var(--tone-5t);\r\n  border: none;\r\n  min-width: 220px;\r\n  height: 32px;\r\n  padding: 2px 8px;\r\n  border-radius: 16px;\r\n  margin-right: 18px;\r\n  -webkit-box-shadow: 0 0 3px 2px rgba(240,246,252,0.58039);\r\n          box-shadow: 0 0 3px 2px rgba(240,246,252,0.58039);\r\n  -webkit-box-shadow: 0 0 3px 2px var(--tone-2t);\r\n          box-shadow: 0 0 3px 2px var(--tone-2t);\r\n}\r\n\r\n.existing-feature-id {\r\n  width: 100%;\r\n  margin-right: 0;\r\n  margin-top: 24px;\r\n}\r\n\r\n.inheader-slide-id::-webkit-input-placeholder, .existing-feature-id::-webkit-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n  -webkit-transform: translateX(-14px);\r\n          transform: translateX(-14px);\r\n  font-size: 1.1em;\r\n}\r\n\r\n.inheader-slide-id::-moz-placeholder, .existing-feature-id::-moz-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n  transform: translateX(-14px);\r\n  font-size: 1.1em;\r\n}\r\n\r\n.inheader-slide-id:-ms-input-placeholder, .existing-feature-id:-ms-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n  transform: translateX(-14px);\r\n  font-size: 1.1em;\r\n}\r\n\r\n.inheader-slide-id::-ms-input-placeholder, .existing-feature-id::-ms-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n  transform: translateX(-14px);\r\n  font-size: 1.1em;\r\n}\r\n\r\n.inheader-slide-id::placeholder,\r\n.existing-feature-id::placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n  -webkit-transform: translateX(-14px);\r\n          transform: translateX(-14px);\r\n  font-size: 1.1em;\r\n}\r\n\r\n.add-slide-btn,\r\n.add-existing-feature-btn {\r\n  height: 28px;\r\n  width: 28px;\r\n  border-radius: 50%;\r\n  border: none;\r\n  position: absolute;\r\n  right: 20px;\r\n  top: 14px;\r\n}\r\n.add-existing-feature-btn {\r\n  right: 2px;\r\n  top: 26px;\r\n}\r\n\r\n.add-slide-btn i,\r\n.add-existing-feature-btn i {\r\n  -webkit-transform: translateY(1px);\r\n          transform: translateY(1px);\r\n}\r\n\r\n/* Slides Body */\r\n.slides-body {\r\n  position: relative;\r\n  width: 100%;\r\n  height: calc(100vh - 111px);\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n}\r\n\r\n.slides-body.highlight {\r\n  border: 5px dashed #7d8794;\r\n  border: 5px dashed var(--tone-3);\r\n}\r\n\r\n.incanvas-slide-name,\r\n.incanvas-slide-id {\r\n  position: absolute;\r\n  top: 20px;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  background-color: rgba(22,27,34,0.55294);\r\n  background-color: var(--tone-5t);\r\n  border: none;\r\n  min-width: 190px;\r\n  padding: 2px 4px;\r\n  display: none;\r\n  text-align: center;\r\n}\r\n\r\n.incanvas-slide-name {\r\n  left: 40px;\r\n  font-size: 1.1em;\r\n}\r\n\r\n.incanvas-slide-name::-webkit-input-placeholder {\r\n  font-size: 1.1em;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n}\r\n\r\n.incanvas-slide-name::-moz-placeholder {\r\n  font-size: 1.1em;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n}\r\n\r\n.incanvas-slide-name:-ms-input-placeholder {\r\n  font-size: 1.1em;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n}\r\n\r\n.incanvas-slide-name::-ms-input-placeholder {\r\n  font-size: 1.1em;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n}\r\n\r\n.incanvas-slide-name::placeholder {\r\n  font-size: 1.1em;\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n  text-align: center;\r\n}\r\n\r\n.incanvas-slide-id {\r\n  right: 40px;\r\n}\r\n\r\n.file-input {\r\n  position: absolute;\r\n  top: 85%;\r\n  left: 50%;\r\n  -webkit-transform: translate(-50%, -50%);\r\n          transform: translate(-50%, -50%);\r\n  height: 32px;\r\n  width: 150px;\r\n  border-radius: 16px;\r\n  display: none;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  -webkit-box-shadow: 0 0 3px 2px rgba(240,246,252,0.58039);\r\n          box-shadow: 0 0 3px 2px rgba(240,246,252,0.58039);\r\n  -webkit-box-shadow: 0 0 3px 2px var(--tone-2t);\r\n          box-shadow: 0 0 3px 2px var(--tone-2t);\r\n  background-color: rgba(22,27,34,0.55294);\r\n  background-color: var(--tone-5t);\r\n  cursor: pointer;\r\n}\r\n\r\n.file-input input {\r\n  display: none;\r\n}\r\n\r\n/* .file-input::after {\r\n  content: 'Or drag & drop here';\r\n  padding: 1px 5px;\r\n  background-color: var(--tone-2t);\r\n  position: absolute;\r\n  top: 40px;\r\n  color: var(--tone-5);\r\n  font-weight: 700;\r\n} */\r\n\r\n.prev-btn,\r\n.next-btn {\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  position: absolute;\r\n  top: 50%;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  font-size: 30px;\r\n  -webkit-transform: translateY(-44px);\r\n          transform: translateY(-44px);\r\n  cursor: pointer;\r\n  height: 44px;\r\n  width: 44px;\r\n  border-radius: 50%;\r\n  -webkit-transition: 0.3s ease;\r\n  transition: 0.3s ease;\r\n  -webkit-box-shadow: 0 0 4px 1px rgba(22,27,34,0.55294);\r\n          box-shadow: 0 0 4px 1px rgba(22,27,34,0.55294);\r\n  -webkit-box-shadow: 0 0 4px 1px var(--tone-5t);\r\n          box-shadow: 0 0 4px 1px var(--tone-5t);\r\n  opacity: 0;\r\n}\r\n\r\n.slides-viewer:hover .prev-btn,\r\n.slides-viewer:hover .next-btn {\r\n  opacity: 1;\r\n}\r\n\r\n.prev-btn:hover,\r\n.next-btn:hover {\r\n  background-color: rgba(22,27,34,0.55294);\r\n  background-color: var(--tone-5t);\r\n}\r\n\r\n.prev-btn {\r\n  left: 40px;\r\n  padding-right: 2px;\r\n}\r\n\r\n.next-btn {\r\n  right: 40px;\r\n  padding-left: 2px;\r\n}\r\n\r\n.canvas {\r\n  width: 560px;\r\n  height: 360px;\r\n  display: none;\r\n}\r\n\r\n.edit-panel {\r\n  display: none;\r\n  position: absolute;\r\n  right: 0;\r\n  top: 50%;\r\n  -webkit-box-orient: vertical;\r\n  -webkit-box-direction: normal;\r\n      -ms-flex-direction: column;\r\n          flex-direction: column;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  width: 60px;\r\n  padding: 10px;\r\n  background-color: rgba(22,27,34,0.55294);\r\n  background-color: var(--tone-5t);\r\n  -webkit-transform: translateY(calc(-50% - 20px));\r\n          transform: translateY(calc(-50% - 20px));\r\n  border-radius: 10px 0 0 10px;\r\n}\r\n\r\n.edit-panel-btn {\r\n  width: 40px;\r\n  height: 40px;\r\n  border-top: 1px solid rgba(240,246,252,0.58039);\r\n  border-top: 1px solid var(--tone-2t);\r\n  border-bottom: 1px solid rgba(240,246,252,0.58039);\r\n  border-bottom: 1px solid var(--tone-2t);\r\n  padding: 4px 0;\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n}\r\n\r\n.edit-panel-btn:last-of-type {\r\n  border-top: none;\r\n}\r\n\r\n.edit-panel-btn.active {\r\n  color: #f9d17c;\r\n  color: var(--orange-1);\r\n}\r\n\r\n.slide-img {\r\n  width: 100%;\r\n  height: 100%;\r\n  background-repeat: no-repeat !important;\r\n  background-size: contain !important;\r\n  background-position: center !important;\r\n  display: block;\r\n  -webkit-transition: all linear 1s;\r\n  transition: all linear 1s;\r\n  -webkit-backface-visibility: hidden;\r\n  -moz-backface-visibility: hidden;\r\n  -ms-backface-visibility: hidden;\r\n}\r\n\r\n.slide-img:after {\r\n  content: 'drag & drop an image here';\r\n  position: absolute;\r\n  top: 0;\r\n  left: 0;\r\n  right: 0;\r\n  bottom: 0;\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  font-size: 40px;\r\n  color: #535b64;\r\n  color: var(--tone-4);\r\n  z-index: -1;\r\n}\r\n\r\n.notes-body {\r\n  position: absolute;\r\n  display: none;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n  background-color: rgba(22,27,34,0.55294);\r\n  background-color: var(--tone-5t);\r\n  width: 80%;\r\n  height: 70%;\r\n  right: 0;\r\n  left: 0;\r\n  margin: 0 auto;\r\n  -webkit-box-orient: vertical;\r\n  -webkit-box-direction: normal;\r\n      -ms-flex-direction: column;\r\n          flex-direction: column;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  padding: 28px;\r\n}\r\n\r\n.notes-body.show {\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n}\r\n\r\n.close-note-btn {\r\n  position: absolute;\r\n  top: 10px;\r\n  right: 10px;\r\n}\r\n\r\n.notes-content {\r\n  /* width: 100%; */\r\n  /* height: 100%; */\r\n  font-size: 1.2em;\r\n  overflow: auto;\r\n  display: block;\r\n  /* white-space: pre-wrap; */\r\n}\r\n\r\n.notes-body textarea {\r\n  width: 100%;\r\n  height: 100%;\r\n  padding: 16px;\r\n  font-size: 1.2em;\r\n}\r\n\r\n.notes-body .slide-controls-btn {\r\n  position: absolute;\r\n  right: 0;\r\n  left: 0;\r\n  bottom: -50px;\r\n  margin: 0 auto;\r\n  background-color: rgba(22,27,34,0.55294);\r\n  background-color: var(--tone-5t);\r\n}\r\n\r\n.slide-controls {\r\n  -webkit-transform: translateY(-74px);\r\n          transform: translateY(-74px);\r\n  width: 100%;\r\n  height: 60px;\r\n  background-color: rgba(22,27,34,0.52157);\r\n  opacity: 0;\r\n  -webkit-transition: opacity 0.2s ease-in;\r\n  transition: opacity 0.2s ease-in;\r\n  display: grid;\r\n  grid-template-columns: 2fr 10fr 2fr;\r\n  justify-items: center;\r\n  -webkit-box-align: center;\r\n      -ms-flex-align: center;\r\n          align-items: center;\r\n}\r\n\r\n.slide-controls.show {\r\n  opacity: 1;\r\n}\r\n\r\n.slides-viewer:hover .slide-controls {\r\n  opacity: 1;\r\n}\r\n\r\n.actions-controls {\r\n  display: -webkit-box;\r\n  display: -ms-flexbox;\r\n  display: flex;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  gap: 30px;\r\n  width: 100%;\r\n}\r\n\r\n.record-btn {\r\n  display: none;\r\n  width: 15px;\r\n  height: 15px;\r\n  background-color: red;\r\n  border-radius: 50%;\r\n  cursor: pointer;\r\n  -webkit-transform: translateY(-1px);\r\n          transform: translateY(-1px);\r\n}\r\n\r\n.stop-rec {\r\n  background-color: rgb(200, 0, 0);\r\n  outline: 1px solid rgb(200, 0, 0);\r\n  outline-offset: 3px;\r\n}\r\n\r\n.rec {\r\n  -webkit-animation-name: pulse;\r\n          animation-name: pulse;\r\n  -webkit-animation-duration: 1s;\r\n          animation-duration: 1s;\r\n  -webkit-animation-iteration-count: infinite;\r\n          animation-iteration-count: infinite;\r\n  -webkit-animation-timing-function: linear;\r\n          animation-timing-function: linear;\r\n}\r\n\r\n@-webkit-keyframes pulse {\r\n  0% {\r\n    -webkit-box-shadow: 0px 0px 3px 0px rgba(255, 0, 0, 0.5);\r\n            box-shadow: 0px 0px 3px 0px rgba(255, 0, 0, 0.5);\r\n  }\r\n  65% {\r\n    -webkit-box-shadow: 0px 0px 3px 7px rgba(255, 0, 0, 0.5);\r\n            box-shadow: 0px 0px 3px 7px rgba(255, 0, 0, 0.5);\r\n  }\r\n  100% {\r\n    -webkit-box-shadow: 0px 0px 3px 7px rgba(255, 0, 0, 0.5);\r\n            box-shadow: 0px 0px 3px 7px rgba(255, 0, 0, 0.5);\r\n  }\r\n}\r\n\r\n@keyframes pulse {\r\n  0% {\r\n    -webkit-box-shadow: 0px 0px 3px 0px rgba(255, 0, 0, 0.5);\r\n            box-shadow: 0px 0px 3px 0px rgba(255, 0, 0, 0.5);\r\n  }\r\n  65% {\r\n    -webkit-box-shadow: 0px 0px 3px 7px rgba(255, 0, 0, 0.5);\r\n            box-shadow: 0px 0px 3px 7px rgba(255, 0, 0, 0.5);\r\n  }\r\n  100% {\r\n    -webkit-box-shadow: 0px 0px 3px 7px rgba(255, 0, 0, 0.5);\r\n            box-shadow: 0px 0px 3px 7px rgba(255, 0, 0, 0.5);\r\n  }\r\n}\r\n\r\n.stop-btn {\r\n  display: none;\r\n}\r\n\r\n/* .record-btn {\r\n  display: block;\r\n} */\r\n\r\n.slide-controls-btn {\r\n  border: none;\r\n  background-color: transparent;\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n  height: 30px;\r\n  width: 110px;\r\n  border-radius: 15px;\r\n  -webkit-box-shadow: 0 0 3px 2px rgba(240,246,252,0.58039);\r\n          box-shadow: 0 0 3px 2px rgba(240,246,252,0.58039);\r\n  -webkit-box-shadow: 0 0 3px 2px var(--tone-2t);\r\n          box-shadow: 0 0 3px 2px var(--tone-2t);\r\n  font-size: 1.2em;\r\n  text-align: center;\r\n  -webkit-transform: translateY(-2px);\r\n          transform: translateY(-2px);\r\n}\r\n\r\n/* viewer and editor toggle styles */\r\n#expand-btn {\r\n  display: block;\r\n}\r\n\r\n#slide-show-notes-btn {\r\n  display: block;\r\n}\r\n\r\n#place-holder-btn {\r\n  display: none;\r\n}\r\n\r\n#slide-submit-btn {\r\n  display: none;\r\n}\r\n\r\n#notes-textarea {\r\n  display: none;\r\n  background-color: rgba(240,246,252,0.58039);\r\n  background-color: var(--tone-2t);\r\n  font-weight: 700;\r\n}\r\n\r\n#submit-notes-btn {\r\n  display: none;\r\n}\r\n\r\n.hide {\r\n  display: none !important;\r\n}\r\n\r\n.show-block {\r\n  display: block !important;\r\n}\r\n\r\n.show-flex {\r\n  display: -webkit-box !important;\r\n  display: -ms-flexbox !important;\r\n  display: flex !important;\r\n}\r\n\r\n/* Media Queries */\r\n@media screen and (max-width: 1536px) {\r\n  .tutorials-container {\r\n    padding: 80px;\r\n    width: 100%;\r\n    height: 100%;\r\n    display: grid;\r\n    grid-template-columns: repeat(4, 1fr);\r\n  }\r\n}\r\n\r\n@media screen and (max-width: 1200px) {\r\n  .tutorials-container {\r\n    padding: 80px;\r\n    width: 100%;\r\n    height: 100%;\r\n    display: grid;\r\n    grid-template-columns: repeat(3, 1fr);\r\n  }\r\n}\r\n\r\n@media screen and (max-width: 960px) {\r\n  .tutorials-container {\r\n    padding: 80px;\r\n    width: 100%;\r\n    height: 100%;\r\n    display: grid;\r\n    grid-template-columns: repeat(2, 1fr);\r\n  }\r\n}\r\n\r\n@media screen and (max-width: 620px) {\r\n  .navbar {\r\n    padding: 0 20px;\r\n    font-size: 1.3em;\r\n  }\r\n\r\n  .navbar li {\r\n    margin-left: 10px;\r\n  }\r\n\r\n  .tutorials-container {\r\n    padding: 80px;\r\n    width: 100%;\r\n    height: 100%;\r\n    display: grid;\r\n    grid-template-columns: repeat(1, 1fr);\r\n  }\r\n}\r\n\r\n::-webkit-scrollbar {\r\n  width: 6px;\r\n  height: 6px;\r\n}\r\n\r\n::-webkit-scrollbar-track {\r\n  background: #535b64;\r\n  background: var(--tone-4);\r\n}\r\n::-webkit-scrollbar-thumb {\r\n  background: rgba(240,246,252,0.58039);\r\n  background: var(--tone-2t);\r\n  border-radius: 3px;\r\n}\r\n\r\n/* Nanorep custom styles */\r\n#nanorep-embedded-widget {\r\n  display: -webkit-box !important;\r\n  display: -ms-flexbox !important;\r\n  display: flex !important;\r\n  -webkit-box-pack: center;\r\n      -ms-flex-pack: center;\r\n          justify-content: center;\r\n  overflow: visible;\r\n}\r\n\r\n#nanorep1 {\r\n  width: 70% !important;\r\n  max-width: 800px !important;\r\n  border: 3px dashed rgba(240,246,252,0.58039) !important;\r\n  border: 3px dashed var(--tone-2t) !important;\r\n}\r\n\r\n#nanorep1 #nanorep-ew .scrollable {\r\n  height: auto !important;\r\n}\r\n\r\n.query-field__buttons {\r\n  background-color: #161b22 !important;\r\n  background-color: var(--tone-5) !important;\r\n}\r\n\r\n#nanorep1 #nanorep-ew .widget-embedded--support-center .query-field__input {\r\n  height: 40px !important;\r\n  background-color: #161b22 !important;\r\n  background-color: var(--tone-5) !important;\r\n  color: #f0f6fc !important;\r\n  color: var(--tone-1) !important;\r\n  line-height: 40px !important;\r\n}\r\n#nanorep1\r\n  #nanorep-ew\r\n  .widget-embedded--support-center\r\n  .query-field__input::-webkit-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n#nanorep1\r\n  #nanorep-ew\r\n  .widget-embedded--support-center\r\n  .query-field__input::-moz-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n#nanorep1\r\n  #nanorep-ew\r\n  .widget-embedded--support-center\r\n  .query-field__input:-ms-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n#nanorep1\r\n  #nanorep-ew\r\n  .widget-embedded--support-center\r\n  .query-field__input::-ms-input-placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n#nanorep1\r\n  #nanorep-ew\r\n  .widget-embedded--support-center\r\n  .query-field__input::placeholder {\r\n  color: rgba(240,246,252,0.58039);\r\n  color: var(--tone-2t);\r\n}\r\n.query-field__suggestion {\r\n  color: #161b22 !important;\r\n  color: var(--tone-5) !important;\r\n  background-color: rgba(240,246,252,0.58039) !important;\r\n  background-color: var(--tone-2t) !important;\r\n}\r\n\r\n.core-search {\r\n  position: relative !important;\r\n}\r\n\r\n.core-search__content {\r\n  /* position: fixed !important;\r\n  top: 0 !important;\r\n  left: 0 !important;\r\n  z-index: 10;\r\n  height: 500px;\r\n  width: 100%; */\r\n}\r\n\r\n/* Article body styles */\r\n\r\n.article-content-btn {\r\n  border: none;\r\n  padding: 4px 8px;\r\n  border-radius: 2px;\r\n  border: 3px solid #535b64;\r\n  border: 3px solid var(--tone-4);\r\n  background-color: rgba(240,246,252,0.58039);\r\n  background-color: var(--tone-2t);\r\n  color: #535b64;\r\n  color: var(--tone-4);\r\n  font-size: 1.2em;\r\n  font-weight: 700;\r\n}\r\n\r\n.article-content-btn:hover {\r\n  border: 3px solid #535b64;\r\n  border: 3px solid var(--tone-4);\r\n  background-color: #535b64;\r\n  background-color: var(--tone-4);\r\n  color: #f0f6fc;\r\n  color: var(--tone-1);\r\n}\r\n", ""]);
// Exports
/* harmony default export */ __webpack_exports__["Z"] = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ 802:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(81);
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(645);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, ".audio-player {\r\n  height: 100%;\r\n  width: 100%;\r\n  display: grid;\r\n  grid-template-columns: 1fr 9fr 1fr;\r\n  align-items: center;\r\n  justify-items: center;\r\n  gap: 10px;\r\n}\r\n\r\n.timeline {\r\n  -webkit-appearance: none;\r\n  width: 100%;\r\n  height: 4px;\r\n  transform: translateY(-2px);\r\n  background-color: #616d79;\r\n  background-size: 0% 100%;\r\n  background-image: linear-gradient(#f0f6fc, #f0f6fc);\r\n  background-repeat: no-repeat;\r\n}\r\n\r\n.timeline::-webkit-slider-thumb {\r\n  -webkit-appearance: none;\r\n  width: 1em;\r\n  height: 1em;\r\n  border-radius: 50%;\r\n  cursor: pointer;\r\n  opacity: 0;\r\n  transition: all 0.1s;\r\n  background-color: #6d87a1;\r\n}\r\n\r\n.timeline::-webkit-slider-thumb:hover {\r\n  background-color: #98cbff;\r\n}\r\n\r\n.timeline:hover::-webkit-slider-thumb {\r\n  opacity: 1;\r\n}\r\n\r\n.timeline::-webkit-slider-runnable-track {\r\n  -webkit-appearance: none;\r\n  box-shadow: none;\r\n  border: none;\r\n  background: transparent;\r\n}\r\n\r\n#compress-btn {\r\n  display: none;\r\n}\r\n", ""]);
// Exports
/* harmony default export */ __webpack_exports__["Z"] = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ 645:
/***/ (function(module) {

"use strict";


/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
module.exports = function (cssWithMappingToString) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = "";
      var needLayer = typeof item[5] !== "undefined";

      if (item[4]) {
        content += "@supports (".concat(item[4], ") {");
      }

      if (item[2]) {
        content += "@media ".concat(item[2], " {");
      }

      if (needLayer) {
        content += "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {");
      }

      content += cssWithMappingToString(item);

      if (needLayer) {
        content += "}";
      }

      if (item[2]) {
        content += "}";
      }

      if (item[4]) {
        content += "}";
      }

      return content;
    }).join("");
  }; // import a list of modules into the list


  list.i = function i(modules, media, dedupe, supports, layer) {
    if (typeof modules === "string") {
      modules = [[null, modules, undefined]];
    }

    var alreadyImportedModules = {};

    if (dedupe) {
      for (var k = 0; k < this.length; k++) {
        var id = this[k][0];

        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }

    for (var _k = 0; _k < modules.length; _k++) {
      var item = [].concat(modules[_k]);

      if (dedupe && alreadyImportedModules[item[0]]) {
        continue;
      }

      if (typeof layer !== "undefined") {
        if (typeof item[5] === "undefined") {
          item[5] = layer;
        } else {
          item[1] = "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {").concat(item[1], "}");
          item[5] = layer;
        }
      }

      if (media) {
        if (!item[2]) {
          item[2] = media;
        } else {
          item[1] = "@media ".concat(item[2], " {").concat(item[1], "}");
          item[2] = media;
        }
      }

      if (supports) {
        if (!item[4]) {
          item[4] = "".concat(supports);
        } else {
          item[1] = "@supports (".concat(item[4], ") {").concat(item[1], "}");
          item[4] = supports;
        }
      }

      list.push(item);
    }
  };

  return list;
};

/***/ }),

/***/ 81:
/***/ (function(module) {

"use strict";


module.exports = function (i) {
  return i[1];
};

/***/ }),

/***/ 280:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
var __webpack_unused_export__;
var _interopRequireDefault=__webpack_require__(957);__webpack_unused_export__ = ({value:!0}),exports.Z=getBlobDuration;var _regenerator=_interopRequireDefault(__webpack_require__(780)),_asyncToGenerator2=_interopRequireDefault(__webpack_require__(877));function getBlobDuration(e){return _getBlobDuration.apply(this,arguments)}function _getBlobDuration(){return(_getBlobDuration=(0,_asyncToGenerator2.default)(_regenerator.default.mark(function e(r){var t,n;return _regenerator.default.wrap(function(e){for(;;)switch(e.prev=e.next){case 0:return t=document.createElement("video"),n=new Promise(function(e,r){t.addEventListener("loadedmetadata",function(){t.duration===1/0?(t.currentTime=Number.MAX_SAFE_INTEGER,t.ontimeupdate=function(){t.ontimeupdate=null,e(t.duration),t.currentTime=0}):e(t.duration)}),t.onerror=function(e){return r(e.target.error)}}),t.src="string"==typeof r||r instanceof String?r:window.URL.createObjectURL(r),e.abrupt("return",n);case 4:case"end":return e.stop()}},e)}))).apply(this,arguments)}
//# sourceMappingURL=getBlobDuration.js.map


/***/ }),

/***/ 877:
/***/ (function(module) {

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

module.exports = _asyncToGenerator;

/***/ }),

/***/ 957:
/***/ (function(module) {

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
}

module.exports = _interopRequireDefault;

/***/ }),

/***/ 780:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

module.exports = __webpack_require__(820);


/***/ }),

/***/ 820:
/***/ (function(module) {

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function define(obj, key, value) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
    return obj[key];
  }
  try {
    // IE 8 has a broken Object.defineProperty that only works on DOM objects.
    define({}, "");
  } catch (err) {
    define = function(obj, key, value) {
      return obj[key] = value;
    };
  }

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  define(Gp, "constructor", GeneratorFunctionPrototype);
  define(GeneratorFunctionPrototype, "constructor", GeneratorFunction);
  GeneratorFunction.displayName = define(
    GeneratorFunctionPrototype,
    toStringTagSymbol,
    "GeneratorFunction"
  );

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      define(prototype, method, function(arg) {
        return this._invoke(method, arg);
      });
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      define(genFun, toStringTagSymbol, "GeneratorFunction");
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return PromiseImpl.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return PromiseImpl.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new PromiseImpl(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  });
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    if (PromiseImpl === void 0) PromiseImpl = Promise;

    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList),
      PromiseImpl
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  define(Gp, toStringTagSymbol, "Generator");

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  define(Gp, iteratorSymbol, function() {
    return this;
  });

  define(Gp, "toString", function() {
    return "[object Generator]";
  });

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
   true ? module.exports : 0
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, in modern engines
  // we can explicitly access globalThis. In older engines we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  if (typeof globalThis === "object") {
    globalThis.regeneratorRuntime = runtime;
  } else {
    Function("r", "regeneratorRuntime = r")(runtime);
  }
}


/***/ }),

/***/ 379:
/***/ (function(module) {

"use strict";


var stylesInDOM = [];

function getIndexByIdentifier(identifier) {
  var result = -1;

  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }

  return result;
}

function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };

    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }

    identifiers.push(identifier);
  }

  return identifiers;
}

function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);

  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }

      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };

  return updater;
}

module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];

    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }

    var newLastIdentifiers = modulesToDom(newList, options);

    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];

      var _index = getIndexByIdentifier(_identifier);

      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();

        stylesInDOM.splice(_index, 1);
      }
    }

    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ 569:
/***/ (function(module) {

"use strict";


var memo = {};
/* istanbul ignore next  */

function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }

    memo[target] = styleTarget;
  }

  return memo[target];
}
/* istanbul ignore next  */


function insertBySelector(insert, style) {
  var target = getTarget(insert);

  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }

  target.appendChild(style);
}

module.exports = insertBySelector;

/***/ }),

/***/ 216:
/***/ (function(module) {

"use strict";


/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}

module.exports = insertStyleElement;

/***/ }),

/***/ 565:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

"use strict";


/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;

  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}

module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ 795:
/***/ (function(module) {

"use strict";


/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";

  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }

  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }

  var needLayer = typeof obj.layer !== "undefined";

  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }

  css += obj.css;

  if (needLayer) {
    css += "}";
  }

  if (obj.media) {
    css += "}";
  }

  if (obj.supports) {
    css += "}";
  }

  var sourceMap = obj.sourceMap;

  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  options.styleTagTransform(css, styleElement, options.options);
}

function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }

  styleElement.parentNode.removeChild(styleElement);
}
/* istanbul ignore next  */


function domAPI(options) {
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}

module.exports = domAPI;

/***/ }),

/***/ 589:
/***/ (function(module) {

"use strict";


/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }

    styleElement.appendChild(document.createTextNode(css));
  }
}

module.exports = styleTagTransform;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
!function() {
"use strict";

;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/arrayLikeToArray.js
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/arrayWithoutHoles.js

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/iterableToArray.js
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/unsupportedIterableToArray.js

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/nonIterableSpread.js
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/toConsumableArray.js




function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
;// CONCATENATED MODULE: ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}
// EXTERNAL MODULE: ./node_modules/@babel/runtime/regenerator/index.js
var regenerator = __webpack_require__(757);
var regenerator_default = /*#__PURE__*/__webpack_require__.n(regenerator);
;// CONCATENATED MODULE: ./src/UI/groupsActions.js


function groupsActions(state) {
  var dropdownBtns = document.querySelectorAll('.dropdown-btn');
  var dropdownContainers = document.querySelectorAll('.dropdown-container');
  var groupsNames = Array.from(document.querySelectorAll('.group-name'));
  var addGroupBtns = Array.from(document.querySelectorAll('.add-group-btn'));
  var selectedGroupNameEl = document.getElementById('selected-group-name');
  var slideImage = document.getElementById('slide-img');
  var featuresColletctions = document.querySelectorAll('.features-collection');

  function renderDropdown() {
    dropdownContainers.forEach(function (el, i) {
      if (el.children.length > 1) {
        dropdownBtns[i].classList.add('dropdown');
      } else {
        dropdownBtns[i].classList.remove('dropdown');
      }
    });
  }

  renderDropdown();
  dropdownBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var _this = this;

      dropdownBtns.forEach(function (button) {
        button === _this ? _this.classList.toggle('active') : button.classList.remove('active');
      });
      var featuresState = document.getElementById('features-state');
      var selectedGroupId = featuresState.dataset.selectedGroupId;

      if (selectedGroupId === this.dataset.groupId || !this.classList.contains('active')) {
        state.selectedGroup = null;
        selectedGroupNameEl.innerText = 'select a group';
      } else {
        var activeFeature = document.querySelector('.feature-btn.active');
        activeFeature && activeFeature.classList.remove('active');

        var _slideImage = document.getElementById('slide-img');

        _slideImage.setAttribute('style', 'background: url("")');

        state.selectedGroup = this.dataset.groupId;
        selectedGroupNameEl.innerText = this.dataset.groupName;
        console.log('clicked');
        localStorage.setItem('storedState', JSON.stringify({
          selectThisGroup: this.dataset.groupId
        }));
      }

      featuresColletctions.forEach(function (fc) {
        fc.dataset.groupId === state.selectedGroup ? fc.style.display = 'flex' : fc.style.display = 'none';
      });
      var note = document.getElementById('add-feature-note');
      note.classList.remove('show');
      var dropdownContent = this.nextElementSibling;

      if (dropdownContent) {
        dropdownContent.style.display === 'block' ? dropdownContent.style.display = 'none' : dropdownContent.style.display = 'block';
      }
    });
  });
  addGroupBtns.forEach(function (btn, i) {
    btn.addEventListener('click', /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee() {
      var name, appId, parentGroupId, res, storedState, data;
      return regenerator_default().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              name = groupsNames[i].value;
              appId = groupsNames[i].dataset.appId;
              parentGroupId = groupsNames[i].dataset.groupId;

              if (!name) {
                _context.next = 18;
                break;
              }

              _context.next = 6;
              return fetch('/groups', {
                method: 'post',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: name,
                  application: appId,
                  parentGroupId: parentGroupId
                })
              });

            case 6:
              res = _context.sent;
              storedState = JSON.parse(localStorage.getItem('storedState'));

              if (!res) {
                _context.next = 18;
                break;
              }

              _context.next = 11;
              return res.text();

            case 11:
              data = _context.sent;
              data = JSON.parse(data);
              console.log(data);
              console.log(data._id);
              storedState.selectThisGroup = data._id;
              localStorage.setItem('storedState', JSON.stringify(storedState));
              location.reload();

            case 18:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })));
  });
}
;// CONCATENATED MODULE: ./src/UI/audioCapture.js
function audioCapture(state) {
  var start = document.getElementById('record-btn');
  var play = document.getElementById('play-btn');
  var stop = document.getElementById('stop-btn');
  var audio = document.getElementById('main-audio');
  var recording;
  navigator.mediaDevices.getUserMedia({
    audio: true
  }).then(function (mediaStreamObj) {
    var mediaRecorder = new MediaRecorder(mediaStreamObj);
    var chunks = [];
    start.addEventListener('click', function (e) {
      e.preventDefault();
      mediaRecorder.start();
      console.log(mediaRecorder.state);
    });
    stop.addEventListener('click', function (e) {
      e.preventDefault();
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
    });

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = function (e) {
      var blob = new Blob(chunks, {
        type: 'audio/wav'
      });
      state.audioBlob = blob;
      console.log(blob);
      chunks = [];
      var audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      recording = audioURL;
    };
  }).catch(function (err) {
    console.log(err);
  });
  start.addEventListener('click', function () {
    stop.classList.add('show-block');
    play.classList.add('hide');
    this.classList.remove('stop-rec');
    this.classList.add('rec');
  });
  stop.addEventListener('click', function () {
    start.classList.add('stop-rec');
    start.classList.remove('rec');
    play.classList.remove('hide');
    this.classList.remove('show-block');
  });
}
;// CONCATENATED MODULE: ./src/UI/canvasDraw.js


function canvasDraw(state, canvas, ctx, scaleToFit, imageObj) {
  var mousedown = false;
  var clicks = [];

  function drawRectangle() {
    ctx.beginPath();
    ctx.rect(clicks[0].x, clicks[0].y, clicks[1].x - clicks[0].x, clicks[1].y - clicks[0].y);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function redraw() {
    canvas.width = canvas.width;
    scaleToFit(imageObj);
    drawRectangle();
  }

  canvas.addEventListener('mousedown', function (e) {
    clicks[0] = {
      x: e.offsetX,
      y: e.offsetY
    };
    mousedown = true;
  });
  canvas.addEventListener('mousemove', function (e) {
    if (mousedown) {
      clicks[1] = {
        x: e.offsetX,
        y: e.offsetY
      };
      redraw();
    }
  });
  canvas.addEventListener('mouseup', /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee(e) {
      var res;
      return regenerator_default().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return fetch(canvas.toDataURL('image/png'));

            case 2:
              res = _context.sent;
              _context.next = 5;
              return res.blob();

            case 5:
              state.editedImage = _context.sent;
              mousedown = false;
              clicks[1] = {
                x: e.offsetX,
                y: e.offsetY
              };

            case 8:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());
  canvas.addEventListener('mouseleave', function () {
    mousedown = false;
  });
}
;// CONCATENATED MODULE: ./src/UI/imageUpload.js
function imageUpload(state, canvas, scaleToFit) {
  var dropArea = document.getElementById('slides-body');
  var fileInput = document.getElementById('file-input');
  var slideImg = document.getElementById('slide-img');
  var imageObj = new Image();

  if (state.mode === 'editor') {
    fileInput.addEventListener('change', function () {
      var img = this.files[0];
      imageToCanvas(img);
    });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
      dropArea.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    ['dragenter', 'dragover'].forEach(function (eventName) {
      dropArea.addEventListener(eventName, function () {
        dropArea.classList.add('highlight');
      });
    });
    ['dragleave', 'drop'].forEach(function (eventName) {
      dropArea.addEventListener(eventName, function () {
        dropArea.classList.remove('highlight');
      });
    });
    dropArea.addEventListener('drop', function (e) {
      var img = e.dataTransfer.files[0];
      imageToCanvas(img);
    });
  }

  function imageToCanvas(img) {
    if (/image*/.test(img.type)) {
      state.imageFile = img;
      slideImg.setAttribute('style', "background: url(\"".concat(window.URL.createObjectURL(img), "\");"));
      console.log(slideImg);
      imageObj.src = window.URL.createObjectURL(img);

      imageObj.onload = function () {
        canvas.width = canvas.width;
        scaleToFit(this);
      };
    }
  }
}
;// CONCATENATED MODULE: ./src/UI/slidesEditor.js





var imageObj = new Image();
var slideImg = document.getElementById('slide-img');
var drawBtn = document.getElementById('draw-btn');
var editBtns = document.querySelectorAll('.edit-panel-btn');
var slidesBody = document.querySelector('.slides-body');
var canvas = document.getElementById('canvas');
var ctx;

if (canvas) {
  ctx = canvas.getContext('2d');
}

drawBtn && drawBtn.addEventListener('click', function () {
  var _this = this;

  slideImg.classList.toggle('hide');
  canvas.classList.toggle('show-block');
  editBtns.forEach(function (btn) {
    btn === _this ? btn.classList.toggle('active') : btn.classList.remove('active');
  });
});

function scaleToFit(img) {
  var scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  var x = canvas.width / 2 - img.width / 2 * scale;
  var y = canvas.height / 2 - img.height / 2 * scale;
  ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
}

function slidesEditor(state) {
  // see if you can move to main to prevent repeated calls
  audioCapture(state);
  imageUpload(state, canvas, scaleToFit);
  canvasDraw(state, canvas, ctx, scaleToFit, imageObj);
  resizeCanvas();
  imageObj.src = '';

  imageObj.onload = function () {
    scaleToFit(this);
  };

  function resizeCanvas() {
    canvas.setAttribute('height', slidesBody.clientHeight);
    canvas.setAttribute('width', slidesBody.clientWidth);
    canvas.style.height = slidesBody.clientHeight;
    canvas.style.width = slidesBody.clientWidth;
  }
}
function sendSlide(state) {
  var addSlide = document.getElementById('add-slide-btn');
  addSlide.addEventListener('click', /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee() {
    var featureId, res, storedState, data;
    return regenerator_default().wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            featureId = document.querySelector('.feature-btn.active');
            state.selectedFeature = featureId;

            if (!featureId) {
              _context.next = 20;
              break;
            }

            featureId = featureId.getAttribute('id');
            _context.next = 6;
            return fetch('/slides', {
              method: 'post',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                featureId: featureId
              })
            });

          case 6:
            res = _context.sent;
            storedState = JSON.parse(localStorage.getItem('storedState'));

            if (!res) {
              _context.next = 20;
              break;
            }

            _context.next = 11;
            return res.text();

          case 11:
            data = _context.sent;
            data = JSON.parse(data);
            console.log(data);
            console.log(data._id);
            storedState.selectThisGroup = data.groups[data.groups.length - 1];
            storedState.selectThisFeature = data._id;
            storedState.selectThisSlide = data.slides[data.slides.length - 1];
            localStorage.setItem('storedState', JSON.stringify(storedState));
            location.reload();

          case 20:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  })));
}
function renderProgressFrags(slides) {
  var slidesProgress = document.querySelector('.slides-progress');
  var slidesHtml = slides.map(function (slide) {
    return slide && slide._id ? "<div class='progress-frag' id=\"".concat(slide._id, "\">\n        <div class='progress-bar'></div>\n        <div class='progress-disc'></div>\n      </div>") : '';
  }).join('');
  slidesProgress.innerHTML = slidesHtml;
}
function renderSlide(state) {
  var slidesBtns = document.querySelectorAll('.progress-frag');
  var slideImg = document.getElementById('slide-img');
  var audio = document.getElementById('main-audio');
  var slideIdEl = document.getElementById('incanvas-slide-id');
  var slideName = document.getElementById('incanvas-slide-name');
  var notesEl = document.getElementById('notes-textarea');
  var notesContent = document.getElementById('notes-content');
  var nextBtn = document.getElementById('next-btn');
  var prevBtn = document.getElementById('prev-btn');

  if (slidesBtns.length) {
    slidesBtns.forEach(function (slide, i) {
      slide.addEventListener('click', function () {
        var _state$slides$i = state.slides[i],
            _id = _state$slides$i._id,
            name = _state$slides$i.name,
            notes = _state$slides$i.notes,
            audioName = _state$slides$i.audioName,
            imageName = _state$slides$i.imageName,
            editedImageName = _state$slides$i.editedImageName,
            duration = _state$slides$i.duration,
            isViewed = _state$slides$i.isViewed;
        slidesBtns.forEach(function (button, j) {
          button === slidesBtns[i] ? button.classList.add('active') : button.classList.remove('active');
          state.slides[j].isViewed && button.classList.add('viewed');
        });
        canvas.classList.remove('show-block');
        slideImg.classList.remove('hide');
        drawBtn.classList.remove('active');
        if (isViewed) slidesBtns[i].classList.add('viewed');
        state.selectedSlide = _id;
        state.playCounter = 0;
        slideName.value = name;
        slideIdEl.value = _id;
        notesEl.value = notes;
        notesContent.innerText = notes;
        audio.src = audioName ? "/slide/audio/".concat(audioName) : '';
        audio.setAttribute('data-duration', duration);
        var imageUrl = imageName ? "/slide/image/".concat(imageName) : '';
        var editedImageUrl = editedImageName ? "/slide/image/".concat(editedImageName) : '';

        if (editedImageUrl) {
          slideImg.style.background = "url(".concat(editedImageUrl, ")");
        } else {
          slideImg.style.background = "url(".concat(imageUrl, ")");
        }

        imageObj.src = imageUrl;
        canvas.width = canvas.width;
        canvasDraw(state, canvas, ctx, scaleToFit, imageObj);
      });
    });

    if (state.selectedSlide) {
      var slideBtn = document.getElementById(state.selectedSlide);
      if (slideBtn) slideBtn.click();
    } else {
      var storedState = JSON.parse(localStorage.getItem('storedState'));

      if (state.mode === 'editor' && storedState.selectThisSlide) {
        var _slideBtn = document.getElementById(storedState.selectThisSlide);

        _slideBtn.click();
      } else {
        slidesBtns[0].click();
      }
    }

    var i = 0;
    nextBtn.addEventListener('click', function () {
      if (slidesBtns.length && i < slidesBtns.length - 1) {
        i++;
        slidesBtns[i].click();
      }
    });
    prevBtn.addEventListener('click', function () {
      if (slidesBtns.length && i > 0) {
        i--;
        slidesBtns[i].click();
      }
    });
  }
}
;// CONCATENATED MODULE: ./src/UI/slidesPlayer.js


function slidesPlayer(state) {
  var playBtn = document.getElementById('play-btn');
  var audio = document.querySelector('audio');
  var playIcon = "<i id='play-btn' class='fa fa-play'></i>";
  var pauseIcon = "<i id='play-btn' class='fa fa-pause'></i>";
  var playTime;

  function playSlide() {
    var duration = audio.dataset.duration;
    var minimunToPlay = parseInt(duration * 0.9);
    var progressFrag = document.getElementById(state.selectedSlide);
    var progress;

    if (audio.paused && progressFrag) {
      audio.play();
      playBtn.innerHTML = pauseIcon;
      var fragProgressBar = progressFrag.querySelector('.progress-bar');
      playTime = setInterval( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee() {
        return regenerator_default().wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                state.playCounter++; // console.log(minimunToPlay);
                // console.log(state.playCounter);

                progress = parseInt(state.playCounter / duration * 100);
                fragProgressBar.style.backgroundImage = "\n        linear-gradient(\n          to right,\n          #f9d17c 0%,\n          #f9d17c ".concat(progress, "%,\n          #39404b ").concat(progress, "%,\n          #39404b 100%\n          )\n          ");

                if (!(state.playCounter > minimunToPlay)) {
                  _context.next = 6;
                  break;
                }

                _context.next = 6;
                return fetch("/slides/viewed/".concat(state.selectedSlide), {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    isViewed: true
                  })
                });

              case 6:
                if (state.playCounter > duration) {
                  progressFrag.classList.add('viewed');
                  clearInterval(playTime);
                }

              case 7:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      })), 1000);
    } else {
      audio.pause();
      playBtn.innerHTML = playIcon;
      clearInterval(playTime);
    }
  }

  if (!state.loaded) {
    playBtn.addEventListener('click', playSlide); // slideImg.addEventListener('click', playSlide);
  }

  audio.onended = function () {
    return playBtn.innerHTML = playIcon;
  };

  var timeline = document.querySelector('.timeline');

  audio.ontimeupdate = function () {
    var percentagePosition = 100 * audio.currentTime / audio.duration;
    timeline.style.backgroundSize = "".concat(percentagePosition, "% 100%");
    timeline.value = percentagePosition;
  }; // full screen


  var expandBtn = document.getElementById('expand-btn');
  var compressBtn = document.getElementById('compress-btn');
  var elem = document.documentElement;
  var contentEl = document.querySelector('.content');
  var controlsEl = document.querySelector('.slide-controls');
  var navbarEl = document.querySelector('.navbar');
  var groupsEl = document.querySelector('.groups');
  var featuresEl = document.querySelector('.features');
  !state.loaded && expandBtn.addEventListener('click', function () {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      /* Safari */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      /* IE11 */
      elem.msRequestFullscreen();
    }

    expandBtn.style.display = 'none';
    compressBtn.style.display = 'block';
    contentEl.style.display = 'block';
    navbarEl.style.display = 'none';
    groupsEl.style.display = 'none';
    featuresEl.style.display = 'none';
    controlsEl.style.transform = 'translateY(0)';
  });
  !state.loaded && compressBtn.addEventListener('click', function () {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      /* Safari */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      /* IE11 */
      document.msExitFullscreen();
    }

    compressBtn.style.display = 'none';
    expandBtn.style.display = 'block';
    contentEl.style.display = 'grid';
    navbarEl.style.display = 'flex';
    groupsEl.style.display = 'block';
    featuresEl.style.display = 'block';
    controlsEl.style.transform = 'translateY(-56px)';
  }); // notes

  var showNotesBtn = document.getElementById('slide-show-notes-btn');
  var addNoteBtn = document.getElementById('add-note-btn');
  var closeNoteBtn = document.getElementById('close-note-btn');
  var notesBody = document.querySelector('.notes-body');

  function toggleNotes() {
    notesBody.classList.toggle('show');
  }

  if (!state.loaded) {
    showNotesBtn.addEventListener('click', toggleNotes);
    addNoteBtn.addEventListener('click', toggleNotes);
    closeNoteBtn.addEventListener('click', toggleNotes);
  }
}
;// CONCATENATED MODULE: ./src/UI/slidesModeToggle.js
function slidesModeToggle(state) {
  var expandBtn = document.getElementById('expand-btn');
  var showNotesBtn = document.getElementById('slide-show-notes-btn');
  var notesContent = document.getElementById('notes-content');
  var controlsEl = document.querySelector('.slide-controls');
  var editPanel = document.getElementById('edit-panel');
  var incanvasSlideName = document.getElementById('incanvas-slide-name');
  var incanvasSlideId = document.getElementById('incanvas-slide-id');
  var addSlideEl = document.querySelector('.add-slide');
  var addExistingFeaure = document.querySelector('.add-existing-feature');
  var placeHolder = document.getElementById('place-holder-btn');
  var slideSubmitBtn = document.getElementById('slide-submit-btn');
  var notesTextarea = document.getElementById('notes-textarea');
  var addGroupFeature = document.querySelectorAll('.add-group-feature');
  var fileInputEl = document.querySelector('.file-input');
  var recordBtn = document.getElementById('record-btn');
  var nextBtn = document.getElementById('next-btn');
  var prevBtn = document.getElementById('prev-btn');
  var hideInEditor = [expandBtn, showNotesBtn, notesContent, nextBtn, prevBtn];
  var showInEditorFlex = [addSlideEl, addExistingFeaure, fileInputEl, editPanel];
  var showInEditorBlock = [incanvasSlideName, incanvasSlideId, placeHolder, slideSubmitBtn, notesTextarea, recordBtn];

  if (state.mode === 'viewer') {
    controlsEl.classList.remove('show');
    hideInEditor.forEach(function (el) {
      return el.classList.remove('hide');
    });
    showInEditorBlock.forEach(function (el) {
      return el.classList.remove('show-block');
    });
    showInEditorFlex.forEach(function (el) {
      return el.classList.remove('show-flex');
    });
    addGroupFeature.forEach(function (el) {
      el.classList.remove('show-flex');
    });
  } else {
    controlsEl.classList.add('show');
    hideInEditor.forEach(function (el) {
      return el.classList.add('hide');
    });
    showInEditorBlock.forEach(function (el) {
      return el.classList.add('show-block');
    });
    showInEditorFlex.forEach(function (el) {
      return el.classList.add('show-flex');
    });
    addGroupFeature.forEach(function (el) {
      el.classList.add('show-flex');
    });
  }
}
;// CONCATENATED MODULE: ./src/UI/slidesActions.js



function slidesActions(state) {
  slidesEditor(state);
  slidesPlayer(state);
  slidesModeToggle(state);
}
;// CONCATENATED MODULE: ./src/UI/homeActions.js


function homeDashboard() {
  var addTutoBtn = document.getElementById('tutorial-add-btn');
  var tutoContainer = document.querySelector('.tutorials-container');
  var tutos = document.querySelectorAll('.tutorial-progress');
  addTutoBtn.addEventListener('click', function () {
    var div = document.createElement('div');
    div.classList.add('tutorial-progress');
    div.innerHTML += "\n      <div class='tutorial'>\n        <div class='title-container'>\n          <textarea\n            placeholder='enter name'\n            type='text'\n            style='overflow:auto'\n          ></textarea>\n        </div>\n      </div>\n    ";
    tutoContainer.insertBefore(div, tutoContainer.children[tutoContainer.children.length - 1]);
    var tutoNameInput = document.querySelector('.title-container textarea');
    tutoNameInput.addEventListener('blur', /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee() {
      var res;
      return regenerator_default().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return fetch('/tutorials', {
                method: 'post',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: tutoNameInput.value
                })
              });

            case 2:
              res = _context.sent;

              if (res) {
                window.location = res.url;
              }

            case 4:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })));
  });

  function openTuto() {}

  tutos.forEach(function (tuto) {
    tuto.addEventListener('click', /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee2() {
      var res;
      return regenerator_default().wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return fetch("/tutorials/show/".concat(tuto.id));

            case 2:
              res = _context2.sent;

              if (res) {
                window.location = res.url;
              }

            case 4:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    })));
  });
}
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js
var injectStylesIntoStyleTag = __webpack_require__(379);
var injectStylesIntoStyleTag_default = /*#__PURE__*/__webpack_require__.n(injectStylesIntoStyleTag);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/styleDomAPI.js
var styleDomAPI = __webpack_require__(795);
var styleDomAPI_default = /*#__PURE__*/__webpack_require__.n(styleDomAPI);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/insertBySelector.js
var insertBySelector = __webpack_require__(569);
var insertBySelector_default = /*#__PURE__*/__webpack_require__.n(insertBySelector);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js
var setAttributesWithoutAttributes = __webpack_require__(565);
var setAttributesWithoutAttributes_default = /*#__PURE__*/__webpack_require__.n(setAttributesWithoutAttributes);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/insertStyleElement.js
var insertStyleElement = __webpack_require__(216);
var insertStyleElement_default = /*#__PURE__*/__webpack_require__.n(insertStyleElement);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/styleTagTransform.js
var styleTagTransform = __webpack_require__(589);
var styleTagTransform_default = /*#__PURE__*/__webpack_require__.n(styleTagTransform);
// EXTERNAL MODULE: ./node_modules/css-loader/dist/cjs.js!./node_modules/postcss-loader/dist/cjs.js!./src/main.css
var main = __webpack_require__(769);
;// CONCATENATED MODULE: ./src/main.css

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (styleTagTransform_default());
options.setAttributes = (setAttributesWithoutAttributes_default());

      options.insert = insertBySelector_default().bind(null, "head");
    
options.domAPI = (styleDomAPI_default());
options.insertStyleElement = (insertStyleElement_default());

var update = injectStylesIntoStyleTag_default()(main/* default */.Z, options);




       /* harmony default export */ var src_main = (main/* default */.Z && main/* default.locals */.Z.locals ? main/* default.locals */.Z.locals : undefined);

;// CONCATENATED MODULE: ./src/UI/featruesActions.js



function featuresActions(state) {
  var featureBtns = document.querySelectorAll('.feature-btn');
  var addFeatureBtn = document.getElementById('add-feature-btn');
  var featureName = document.getElementById('feature-name');
  var note = document.getElementById('add-feature-note');
  addFeatureBtn.addEventListener('click', /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee() {
    var selectedGroupId, res, storedState, data;
    return regenerator_default().wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            // const featuresState = document.getElementById('features-state');
            // const { selectedGroupId } = featuresState.dataset;
            selectedGroupId = state.selectedGroup;
            if (!selectedGroupId) note.classList.add('show');

            if (!selectedGroupId) {
              _context.next = 18;
              break;
            }

            _context.next = 5;
            return fetch('/features', {
              method: 'post',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: featureName.value,
                groupId: selectedGroupId
              })
            });

          case 5:
            res = _context.sent;
            storedState = JSON.parse(localStorage.getItem('storedState'));

            if (!res) {
              _context.next = 18;
              break;
            }

            _context.next = 10;
            return res.text();

          case 10:
            data = _context.sent;
            data = JSON.parse(data);
            console.log(data);
            console.log(data._id);
            storedState.selectThisGroup = data.groups[data.groups.length - 1];
            storedState.selectThisFeature = data._id;
            localStorage.setItem('storedState', JSON.stringify(storedState));
            location.reload();

          case 18:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  })));
  featureBtns.forEach(function (btn) {
    btn.addEventListener('click', /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee2() {
      var _this = this;

      var featureId, res, data;
      return regenerator_default().wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              featureBtns.forEach(function (button) {
                button === _this ? _this.classList.toggle('active') : button.classList.remove('active');
              });
              featureId = this.getAttribute('id');
              state.selectedFeature = featureId;
              _context2.next = 5;
              return fetch("/features/".concat(featureId));

            case 5:
              res = _context2.sent;
              _context2.next = 8;
              return res.json();

            case 8:
              data = _context2.sent;
              state.slides = data;
              renderProgressFrags(state.slides);
              renderSlide(state);

            case 12:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    })));
  });
}
// EXTERNAL MODULE: ./node_modules/get-blob-duration/dist/getBlobDuration.js
var getBlobDuration = __webpack_require__(280);
;// CONCATENATED MODULE: ./src/UI/slideToDb.js



function slideToDb(state) {
  var submit = document.getElementById('slide-submit-btn');
  submit.addEventListener('click', /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regenerator_default().mark(function _callee(e) {
      var audio, slideName, slideId, notes, formData, audioDuration, res, storedState, data;
      return regenerator_default().wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              e.preventDefault();
              audio = document.getElementById('main-audio');
              slideName = document.getElementById('incanvas-slide-name').value;
              slideId = document.getElementById('incanvas-slide-id').value;
              notes = document.getElementById('notes-textarea').value;
              formData = new FormData();

              if (!slideId) {
                _context.next = 44;
                break;
              }

              if (!state.audioBlob) {
                _context.next = 17;
                break;
              }

              formData.append('audio', state.audioBlob);
              _context.next = 11;
              return fetch("/slide/upload-audio/".concat(slideId), {
                method: 'POST',
                body: formData
              });

            case 11:
              _context.next = 13;
              return (0,getBlobDuration/* default */.Z)(state.audioBlob);

            case 13:
              audioDuration = _context.sent;
              audioDuration = Math.floor(audioDuration);
              _context.next = 18;
              break;

            case 17:
              audioDuration = audio.dataset.duration;

            case 18:
              if (!state.imageFile) {
                _context.next = 23;
                break;
              }

              formData.delete('audio');
              formData.append('image', state.imageFile);
              _context.next = 23;
              return fetch("/slide/upload-image/".concat(slideId), {
                method: 'POST',
                body: formData
              });

            case 23:
              if (!state.editedImage) {
                _context.next = 28;
                break;
              }

              formData.delete('audio');
              formData.append('image', state.editedImage);
              _context.next = 28;
              return fetch("/slide/edited-image/".concat(slideId), {
                method: 'POST',
                body: formData
              });

            case 28:
              _context.next = 30;
              return fetch("/slides/".concat(slideId), {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  slideName: slideName,
                  notes: notes,
                  duration: audioDuration ? audioDuration : 0
                })
              });

            case 30:
              res = _context.sent;
              storedState = JSON.parse(localStorage.getItem('storedState'));

              if (!res) {
                _context.next = 44;
                break;
              }

              _context.next = 35;
              return res.text();

            case 35:
              data = _context.sent;
              data = JSON.parse(data);
              console.log(data);
              console.log(data._id);
              storedState.selectThisGroup = data.groups[data.groups.length - 1];
              storedState.selectThisFeature = data._id;
              storedState.selectThisSlide = data.slides[data.slides.length - 1];
              localStorage.setItem('storedState', JSON.stringify(storedState));
              location.reload();

            case 44:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());
}
;// CONCATENATED MODULE: ./src/main.js








var state = {
  mode: '',
  loaded: false,
  slideSent: false,
  audioBlob: null,
  imageFile: null,
  editedImage: null,
  selectedGroup: null,
  selectedFeature: null,
  selectedSlide: null,
  slides: [],
  playCounter: 0
};
var viewerBtn = document.getElementById('viewer-btn');
var editorBtn = document.getElementById('editor-btn');
var navBtns = document.getElementById('nav-btns');

function resetNavBtnsStyle() {
  _toConsumableArray(navBtns.children).forEach(function (el) {
    return el.classList.remove('active');
  });
}

viewerBtn.addEventListener('click', setViewerMode);

function setViewerMode() {
  state.mode = 'viewer';
  state.loaded = true;
  slidesActions(state);
  resetNavBtnsStyle();
  viewerBtn.classList.add('active');
  editorBtn.style.display = 'none';
}

editorBtn.addEventListener('click', setEditorMode);

function setEditorMode() {
  if (location.href.includes('show-ze-editor')) {
    editorBtn.style.display = 'block';
    state.mode = 'editor';
    state.loaded = true;
    slidesActions(state);
    resetNavBtnsStyle();
    editorBtn.classList.add('active');
  } else {
    setViewerMode();
  }
}

if (!/tutorials\/show$/.test(location.href)) {
  groupsActions(state);
  featuresActions(state);
  slidesActions(state);
  setEditorMode();
  sendSlide(state);
  renderSlide(state);
  slideToDb(state);
}

if (/tutorials\/show$/.test(location.href)) {
  homeDashboard();
}

window.addEventListener('DOMContentLoaded', handleStoredState);

function handleStoredState() {
  var storedState = JSON.parse(localStorage.getItem('storedState'));

  if (!storedState) {
    localStorage.setItem('storedState', '{}');
    storedState = JSON.parse(localStorage.getItem('storedState'));
  } else {
    if (state.mode === 'editor') {
      if (storedState.selectThisGroup) {
        var groupBtn = document.getElementById(storedState.selectThisGroup);
        setTimeout(function () {
          groupBtn.click(); // storedState.selectThisGroup = '';
          // localStorage.setItem('storedState', JSON.stringify(storedState));
        }, 300);
      }

      if (storedState.selectThisFeature) {
        var featureBtn = document.getElementById(storedState.selectThisFeature);
        setTimeout(function () {
          featureBtn.click(); // storedState.selectThisFeature = '';
          // localStorage.setItem('storedState', JSON.stringify(storedState));
        }, 300);
      }

      if (storedState.selectThisSlide) {
        setTimeout(function () {
          var slideBtn = document.getElementById(storedState.selectThisSlide);
          slideBtn && slideBtn.click();
        }, 300);
      }
    }
  }
} // setTimeout(() => {
//   const target = document.querySelector('.core-search__content');
//   console.log(target.getBoundingClientRect());
//   console.log(target.parentElement);
// }, 5000);
}();
/******/ })()
;