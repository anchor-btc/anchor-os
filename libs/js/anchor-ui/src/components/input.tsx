import * as React from "react";
import { cn } from "../utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Error state - adds error styling
   */
  error?: boolean;
  /**
   * Left icon/element
   */
  leftElement?: React.ReactNode;
  /**
   * Right icon/element
   */
  rightElement?: React.ReactNode;
}

/**
 * Input component with support for icons and error states.
 *
 * @example
 * ```tsx
 * <Input placeholder="Email" type="email" />
 * <Input error placeholder="Invalid input" />
 * <Input leftElement={<SearchIcon />} placeholder="Search..." />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftElement, rightElement, ...props }, ref) => {
    const inputClasses = cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      error && "border-destructive focus-visible:ring-destructive",
      leftElement && "pl-10",
      rightElement && "pr-10",
      className
    );

    if (leftElement || rightElement) {
      return (
        <div className="relative">
          {leftElement && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftElement}
            </div>
          )}
          <input type={type} className={inputClasses} ref={ref} {...props} />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightElement}
            </div>
          )}
        </div>
      );
    }

    return <input type={type} className={inputClasses} ref={ref} {...props} />;
  }
);
Input.displayName = "Input";

export { Input };

