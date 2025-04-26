import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const ColorfulTabs = TabsPrimitive.Root

const ColorfulTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-gray-200 to-gray-100 p-1 text-muted-foreground shadow-md",
      className
    )}
    {...props}
  />
))
ColorfulTabsList.displayName = "ColorfulTabsList"

const ColorfulTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    color?: "red" | "orange" | "green" | "blue" | "purple" | "pink" | "cyan" | "amber" | "indigo" | "default"
  }
>(({ className, color = "default", ...props }, ref) => {
  // Define gradient colors for different tab states
  const colorStyles = {
    default: {
      inactive: "hover:bg-gray-100 hover:text-gray-900",
      active: "bg-white data-[state=active]:shadow-md data-[state=active]:text-gray-900"
    },
    red: {
      inactive: "hover:bg-red-50 hover:text-red-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md"
    },
    orange: {
      inactive: "hover:bg-orange-50 hover:text-orange-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md"
    },
    green: {
      inactive: "hover:bg-green-50 hover:text-green-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md"
    },
    blue: {
      inactive: "hover:bg-blue-50 hover:text-blue-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-sky-500 data-[state=active]:text-white data-[state=active]:shadow-md"
    },
    purple: {
      inactive: "hover:bg-purple-50 hover:text-purple-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md"
    },
    pink: {
      inactive: "hover:bg-pink-50 hover:text-pink-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-400 data-[state=active]:text-white data-[state=active]:shadow-md"
    },
    cyan: {
      inactive: "hover:bg-cyan-50 hover:text-cyan-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-400 data-[state=active]:text-white data-[state=active]:shadow-md"
    },
    amber: {
      inactive: "hover:bg-amber-50 hover:text-amber-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-400 data-[state=active]:text-white data-[state=active]:shadow-md"
    },
    indigo: {
      inactive: "hover:bg-indigo-50 hover:text-indigo-700",
      active: "data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-400 data-[state=active]:text-white data-[state=active]:shadow-md"
    }
  }

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        colorStyles[color].inactive,
        colorStyles[color].active,
        className
      )}
      {...props}
    />
  )
})
ColorfulTabsTrigger.displayName = "ColorfulTabsTrigger"

const ColorfulTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
ColorfulTabsContent.displayName = "ColorfulTabsContent"

export { ColorfulTabs, ColorfulTabsList, ColorfulTabsTrigger, ColorfulTabsContent }