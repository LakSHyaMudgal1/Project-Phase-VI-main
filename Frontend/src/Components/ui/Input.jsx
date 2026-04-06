import React from "react";

export default function Input({ className = "", ...props }) {
  return (
    <input
      className={[
        "h-10 w-full rounded-2xl px-3 text-sm",
        "bg-white/5 border border-white/10",
        "placeholder:text-mutedForeground",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-white/20",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

