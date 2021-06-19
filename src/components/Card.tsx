import React from "react";
import { SortableItem, SortableItemOverlay } from "./SortableItem";
import { Item } from "./types";
import { areEqualWithIndexPath } from "./helpers";

interface ItemContentProps {
  item: Item;
}

export const CardContent = React.memo(function ItemContent({
  item,
}: ItemContentProps) {
  return <div>{item.data.title}</div>;
});

export const SortableCard = React.memo(function SortableCard({
  isOverlay,
  item,
  itemIndex,
  laneId,
  laneIndexPath,
}: {
  isOverlay: boolean;
  item: Item;
  itemIndex: number;
  laneId: string;
  laneIndexPath: number[];
}) {
  const ItemElement = isOverlay ? SortableItemOverlay : SortableItem;
  const ctx = {
    parentId: laneId,
    indexPath: [...laneIndexPath, itemIndex],
    data: item,
  };

  return (
    <ItemElement className="item" ctx={ctx}>
      <CardContent item={item} />
    </ItemElement>
  );
},
areEqualWithIndexPath);
