import React from "react";
import { SortableItem } from "./SortableItem";
import { Lane, SortableDirection } from "./types";
import { areEqualWithIndexPath } from "./helpers";
import { SortableDroppableList, SortableListOverlay } from "./SortableList";
import { SortableCard } from "./Card";

interface LaneContentProps {
  lane: Lane;
  parentId: string;
  indexPath: number[];
  isOverlay?: boolean;
}

export const LaneContent = React.memo(function LaneContent({
  lane,
  parentId,
  indexPath = [],
  isOverlay,
}: LaneContentProps) {
  const ListElement = isOverlay ? SortableListOverlay : SortableDroppableList;
  const ctx = {
    parentId,
    indexPath,
    data: lane,
  };

  return (
    <div>
      <div className="lane-title">{lane.data.title}</div>
      <div className="lane-items">
        <ListElement
          content={lane}
          accepts="item"
          direction={SortableDirection.Vertical}
          ctx={ctx}
        >
          {lane.children.map((item, i) => (
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

export const SortableLane = React.memo(function SortableLane({
  lane,
  laneIndex,
  parentId,
}: {
  lane: Lane;
  laneIndex: number;
  parentId: string;
}) {
  const ctx = {
    parentId,
    indexPath: [laneIndex],
    data: lane,
  };

  return (
    <SortableItem className="lane" ctx={ctx}>
      <LaneContent parentId={parentId} indexPath={ctx.indexPath} lane={lane} />
    </SortableItem>
  );
});
