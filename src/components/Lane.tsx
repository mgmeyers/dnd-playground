import React from "react";
import { SortableItem } from "./SortableItem";
import { Lane, SortableDirection } from "./types";
import { areEqualWithIndexPath } from "./helpers";
import { SortableDroppableList, SortableListOverlay } from "./SortableList";
import { CardContent, SortableCard } from "./Card";
import {
  DragDroppable,
  DragDroppableList,
  DragDroppableOverlay,
} from "../alt/DragDroppable";

interface LaneContentProps {
  lane: Lane;
  laneIndex: number;
  isOverlay?: boolean;
}

export function DraggableLane({
  lane,
  laneIndex,
  isOverlay,
}: LaneContentProps) {
  return (
    <>
      <div className="lane-title">{lane.data.title}</div>
      <DragDroppableList className="lane-items" orientation="vertical">
        {lane.children.map((item, i) =>
          isOverlay ? (
            <DragDroppableOverlay
              className="item"
              key={item.id}
              orientation="vertical"
            >
              <CardContent key={lane.id} item={item} />
            </DragDroppableOverlay>
          ) : (
            <DragDroppable
              className="item"
              id={item.id}
              indexPath={[laneIndex, i]}
              key={item.id}
              orientation="vertical"
              type="item"
            >
              <CardContent key={lane.id} item={item} />
            </DragDroppable>
          )
        )}
      </DragDroppableList>
    </>
  );
}

/*
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
*/
