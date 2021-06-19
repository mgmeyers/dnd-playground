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

export const ItemContent = React.memo(function ItemContent({
  item,
}: ItemContentProps) {
  return <div>{item.title}</div>;
});

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

  return (
    <div>
      <div className="lane-title">{lane.title}</div>
      <div className="lane-items">
        <ListElement
          list={lane.items}
          id={lane.id}
          accepts="item"
          direction={SortableDirection.Vertical}
          ctx={{
            indexPath,
          }}
        >
          {lane.items.map((item, i) => (
            <SortableCard
              key={item.id}
              isOverlay={!!isOverlay}
              item={item}
              itemIndex={i}
              laneId={lane.id}
              laneIndexPath={indexPath}
            />
          ))}
        </ListElement>
      </div>
    </div>
  );
},
areEqualWithIndexPath);

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

  return (
    <ItemElement
      className="item"
      ctx={{
        type: "item",
        containingListId: laneId,
        indexPath: [...laneIndexPath, itemIndex],
        data: item,
      }}
      id={item.id}
    >
      <ItemContent item={item} />
    </ItemElement>
  );
},
areEqualWithIndexPath);

export const SortableLane = React.memo(function SortableLane({
  lane,
  laneIndex,
}: {
  lane: Lane;
  laneIndex: number;
}) {
  return (
    <SortableItem
      className="lane"
      ctx={{
        type: "lane",
        containingListId: "base",
        indexPath: [laneIndex],
        data: lane,
      }}
      id={lane.id}
    >
      <LaneContent indexPath={[laneIndex]} lane={lane} />
    </SortableItem>
  );
});
