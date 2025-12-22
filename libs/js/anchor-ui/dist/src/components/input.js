import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { jsxs, jsx } from 'react/jsx-runtime';

// src/components/input.tsx
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
var Input = React.forwardRef(
  ({ className, type, error, leftElement, rightElement, ...props }, ref) => {
    const inputClasses = cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      error && "border-destructive focus-visible:ring-destructive",
      leftElement && "pl-10",
      rightElement && "pr-10",
      className
    );
    if (leftElement || rightElement) {
      return /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        leftElement && /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", children: leftElement }),
        /* @__PURE__ */ jsx("input", { type, className: inputClasses, ref, ...props }),
        rightElement && /* @__PURE__ */ jsx("div", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground", children: rightElement })
      ] });
    }
    return /* @__PURE__ */ jsx("input", { type, className: inputClasses, ref, ...props });
  }
);
Input.displayName = "Input";

export { Input };
//# sourceMappingURL=input.js.map
//# sourceMappingURL=input.js.map