import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary-600 shadow-glow hover:shadow-glow-lg active:scale-[0.98]",
        destructive:
          "bg-danger text-white hover:bg-danger/90 shadow-glow-red",
        outline:
          "border-2 border-border bg-surface hover:bg-surface-light hover:border-primary/50 text-text-primary",
        secondary:
          "bg-surface-light text-text-primary hover:bg-border border border-border",
        ghost:
          "hover:bg-surface-light text-text-secondary hover:text-text-primary",
        link:
          "text-primary underline-offset-4 hover:underline",
        success:
          "bg-accent text-white hover:bg-accent/90 shadow-glow-green",
        gold:
          "bg-gradient-to-r from-warning to-gold text-surface font-bold hover:shadow-glow-gold active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
