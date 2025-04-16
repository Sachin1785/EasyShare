import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../../lib/utils";

const Progress = React.forwardRef(({ 
  className, 
  value, 
  showValue = false,
  variant = "default",
  size = "default",
  ...props 
}, ref) => {
  const [progress, setProgress] = React.useState(0)
  
  React.useEffect(() => {
    const animationTimeout = setTimeout(() => setProgress(value), 100)
    return () => clearTimeout(animationTimeout)
  }, [value])

  return (
    <div className="relative w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
          {
            "h-1": size === "sm",
            "h-2": size === "default",
            "h-3": size === "lg",
          },
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all duration-300 ease-in-out",
            {
              "bg-primary": variant === "default",
              "bg-blue-500": variant === "blue",
              "bg-green-500": variant === "green",
              "bg-amber-500": variant === "amber",
              "bg-red-500": variant === "destructive",
              "animate-pulse": progress < 100 && progress > 0,
            }
          )}
          style={{ transform: `translateX(-${100 - (progress || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
      {showValue && (
        <span className="absolute right-0 -top-6 text-xs font-medium">
          {Math.round(progress || 0)}%
        </span>
      )}
    </div>
  )
})
Progress.displayName = "Progress"

export { Progress } 