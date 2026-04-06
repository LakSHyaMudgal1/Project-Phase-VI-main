import React from "react";

const variants = {
  primary:
    "bg-primary text-primaryForeground hover:opacity-90 shadow-soft",
  secondary:
    "bg-white/5 text-foreground hover:bg-white/10 border border-white/10",
  ghost:
    "bg-transparent text-foreground hover:bg-white/5 border border-transparent",
  danger:
    "bg-red-500/15 text-red-200 hover:bg-red-500/20 border border-red-500/30",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export default function Button({
  className = "",
  variant = "primary",
  size = "md",
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-2xl transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizes[size] || sizes.md,
        variants[variant] || variants.primary,
        className,
      ].join(" ")}
      {...props}
    />
  );
}

