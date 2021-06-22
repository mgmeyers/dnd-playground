import React from "react";
import { Item } from "./types";

interface ItemContentProps {
  item: Item;
}

export const CardContent = React.memo(function ItemContent({
  item,
}: ItemContentProps) {
  return <div className="item">{item.data.title}</div>;
});

