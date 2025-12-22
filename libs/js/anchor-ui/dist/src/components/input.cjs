'use strict';

var React = require('react');
var clsx = require('clsx');
var tailwindMerge = require('tailwind-merge');
var jsxRuntime = require('react/jsx-runtime');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var React__namespace = /*#__PURE__*/_interopNamespace(React);

// src/components/input.tsx
function cn(...inputs) {
  return tailwindMerge.twMerge(clsx.clsx(inputs));
}
var Input = React__namespace.forwardRef(
  ({ className, type, error, leftElement, rightElement, ...props }, ref) => {
    const inputClasses = cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      error && "border-destructive focus-visible:ring-destructive",
      leftElement && "pl-10",
      rightElement && "pr-10",
      className
    );
    if (leftElement || rightElement) {
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative", children: [
        leftElement && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", children: leftElement }),
        /* @__PURE__ */ jsxRuntime.jsx("input", { type, className: inputClasses, ref, ...props }),
        rightElement && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground", children: rightElement })
      ] });
    }
    return /* @__PURE__ */ jsxRuntime.jsx("input", { type, className: inputClasses, ref, ...props });
  }
);
Input.displayName = "Input";

exports.Input = Input;
//# sourceMappingURL=input.cjs.map
//# sourceMappingURL=input.cjs.map