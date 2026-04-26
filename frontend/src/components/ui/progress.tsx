"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-secondary relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 transition-all duration-300 ease-out"
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          background: value && value > 80 
            ? 'linear-gradient(90deg, var(--color-success), var(--color-success-light))'
            : value && value > 50
            ? 'linear-gradient(90deg, var(--color-info), var(--color-info-light))'
            : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))'
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
