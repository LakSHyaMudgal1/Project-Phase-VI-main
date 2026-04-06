import React from "react";

export default function Card({ className = "", ...props }) {
  return (
    <div className={["glass rounded-3xl", className].join(" ")} {...props} />
  );
}

