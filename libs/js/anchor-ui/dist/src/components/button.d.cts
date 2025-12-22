import * as class_variance_authority_types from 'class-variance-authority/types';
import * as React from 'react';
import { VariantProps } from 'class-variance-authority';

declare const buttonVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "accent" | null | undefined;
    size?: "default" | "sm" | "lg" | "xl" | "icon" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    /**
     * Loading state - shows a spinner and disables the button
     */
    loading?: boolean;
}
/**
 * Button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="default">Click me</Button>
 * <Button variant="outline" size="sm">Small outline</Button>
 * <Button variant="accent">App accent color</Button>
 * ```
 */
declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

export { Button, type ButtonProps, buttonVariants };
