import React from "react";
import { Item } from "./types";

interface ItemContentProps {
  title: string;
}

export const CardContent = React.memo(function ItemContent({
  title,
}: ItemContentProps) {
  return <div className="item">{title}</div>;
});

