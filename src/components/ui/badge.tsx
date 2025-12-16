import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Severity badges
        critical:
          "border-transparent bg-severity-critical/10 text-severity-critical",
        moderate:
          "border-transparent bg-severity-moderate/10 text-severity-moderate",
        good:
          "border-transparent bg-severity-good/10 text-severity-good",
        // Pillar badges
        ra: "border-transparent bg-pillar-ra/10 text-pillar-ra",
        oe: "border-transparent bg-pillar-oe/10 text-pillar-oe",
        ao: "border-transparent bg-pillar-ao/10 text-pillar-ao",
        // Status badges
        draft: "border-transparent bg-muted text-muted-foreground",
        ready: "border-transparent bg-severity-moderate/10 text-severity-moderate",
        calculated: "border-transparent bg-severity-good/10 text-severity-good",
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
