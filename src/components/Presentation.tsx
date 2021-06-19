import React from "react";
import {
  SortableItem,
  SortableItemOverlay,
  SortableListOverlay,
  SortableDroppableList,
} from "./Sortable";
import { Item, Lane, SortableDirection } from "./types";
import { areEqualWithIndexPath } from "./helpers";

interface ItemContentProps {
  item: Item;
}

export function ItemContent({ item }: ItemContentProps) {
  return <div>{item.title}</div>;
}

interface LaneContentProps {
  lane: Lane;
  indexPath?: number[];
  isOverlay?: boolean;
}

export const LaneContent = React.memo(function LaneContent({
  lane,
  indexPath = [],
  isOverlay,
}: LaneContentProps) {
  const ListElement = isOverlay ? SortableListOverlay : SortableDroppableList;
  const ItemElement = isOverlay ? SortableItemOverlay : SortableItem;

  return (
    <div>
      <div className="lane-title">{lane.title}</div>
      <ListElement
        className="lane-items"
        list={lane.items}
        id={lane.id}
        accepts="item"
        direction={SortableDirection.Vertical}
        ctx={{
          indexPath,
        }}
      >
        {lane.items.map((item, i) => (
          <ItemElement
            className="item"
            ctx={{
              type: "item",
              containingListId: lane.id,
              indexPath: [...indexPath, i],
              data: item,
            }}
            key={item.id}
            id={item.id}
          >
            <ItemContent item={item} />
          </ItemElement>
        ))}
      </ListElement>
    </div>
  );
},
areEqualWithIndexPath);
