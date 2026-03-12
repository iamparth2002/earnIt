import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/20 text-primary",
        secondary:
          "border-border bg-surface-light text-text-primary",
        destructive:
          "border-danger/30 bg-danger-light text-danger",
        outline:
          "border-border text-text-primary",
        success:
          "border-accent/30 bg-accent-light text-accent",
        warning:
          "border-warning/30 bg-warning/20 text-warning",
        gold:
          "border-gold/30 bg-gradient-to-r from-warning/20 to-gold/20 text-warning",
        locked:
          "border-border bg-surface-secondary text-text-muted",
        xp:
          "border-xp/30 bg-xp-light text-xp",
        mana:
          "border-mana/30 bg-mana-light text-mana",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
