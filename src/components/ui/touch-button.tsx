import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/useHaptic";

const touchButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] touch-target select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/60",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 py-3",
        sm: "h-10 rounded-md px-4",
        lg: "h-14 rounded-md px-8",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface TouchButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof touchButtonVariants> {
  asChild?: boolean;
  hapticFeedback?: boolean;
  hapticPattern?: 'light' | 'medium' | 'heavy' | 'selection';
}

const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, variant, size, asChild = false, hapticFeedback = true, hapticPattern = 'light', onClick, ...props }, ref) => {
    const { lightTap, mediumTap, heavyTap, selection } = useHaptic();
    const Comp = asChild ? Slot : "button";

    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (hapticFeedback) {
        switch (hapticPattern) {
          case 'medium':
            mediumTap();
            break;
          case 'heavy':
            heavyTap();
            break;
          case 'selection':
            selection();
            break;
          default:
            lightTap();
        }
      }
      onClick?.(e);
    }, [hapticFeedback, hapticPattern, lightTap, mediumTap, heavyTap, selection, onClick]);

    return (
      <Comp
        className={cn(touchButtonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
TouchButton.displayName = "TouchButton";

export { TouchButton, touchButtonVariants };
