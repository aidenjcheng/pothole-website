"use client"

import * as React from "react"
// import { Search01Icon } from "@hugeicons/core-free-icons"
// import { HugeiconsIcon } from "@hugeicons/react"

const EnterIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    color="currentColor"
    viewBox="0 0 24 24"
    {...props}
    >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 6h4.5a4.5 4.5 0 1 1 0 9H4"
    ></path>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 12s-3 2.21-3 3 3 3 3 3"
    ></path>
  </svg>
);




import { SearchIcon } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "~/lib/utils"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col rounded-md bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}
function CommandMenuKbd({ className, ...props }: React.ComponentProps<"kbd"> & { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "pointer-events-none flex h-5 items-center justify-center gap-1 rounded border bg-background px-1 font-sans text-[0.7rem] font-medium text-muted-foreground select-none",
        className
      )}
      {...props}
    />
  )
}
function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run…",
  children,
  footerText = "Go to Pothole",
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  footerText?: string
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogPopup className="overflow-hidden p-0 sm:max-w-xl [&>button:last-child]:hidden">
        <Command className="max-h-[100dvh]  [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:text-foreground [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-1.5 p-3">
          {children}
        </Command>
        <div className="flex items-center gap-2 border-t bg-muted px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <CommandMenuKbd><EnterIcon className="size-3"/></CommandMenuKbd>
          {/* <CommandMenuKbd>K</CommandMenuKbd>{" "} */}
          {footerText}
        </div>
      </div>
      </DialogPopup>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="relative">
      <div className="relative inline-flex w-full rounded-md bg-muted bg-clip-padding text-base/5 ring-ring/24 transition-[color,background-color,box-shadow,border-color] outline-none has-focus-visible:border-ring sm:text-sm dark:bg-input/32 dark:bg-clip-border">
        <CommandPrimitive.Input
          data-slot="command-input-wrapper"
          className={cn(
            "w-full min-w-0 px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2.5)-1px)] ps-9 outline-none placeholder:text-muted-foreground/64",
            className
          )}
          {...props}
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-[calc(--spacing(3)-1px)] text-muted-foreground">
        <SearchIcon className="size-4" />
      </div>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-77.5 flex-1 overflow-x-hidden overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden text-foreground [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-base outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground sm:text-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
      <kbd
        data-slot="command-shortcut"
        className={cn(
          "ms-auto -me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70",
          className
        )}
        {...props}
      >
        {children}
      </kbd>
  )
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}