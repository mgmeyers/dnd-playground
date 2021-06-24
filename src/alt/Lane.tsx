import React from "react";
import { Lane } from "./types";
import { CardContent } from "./Card";
import { SortableList, Sortable } from "./DragDroppable";

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
    <div className="lane">
      <div className="lane-title">{lane.data.title}</div>
      <SortableList className="lane-items" orientation="vertical">
        {lane.children.map((item, i) => (
          <Sortable
            className="item-wrapper"
            id={item.id}
            path={`${laneIndex}.${i}`}
            key={item.id}
            orientation="vertical"
            type="item"
            isOverlay={isOverlay}
          >
            <CardContent key={lane.id} title={item.data.title} />
          </Sortable>
        ))}
      </SortableList>
    </div>
  );
}
