"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

export { TooltipProvider }
