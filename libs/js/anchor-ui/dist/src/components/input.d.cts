import * as React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;

export { Input, type InputProps };
