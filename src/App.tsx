import { DndContext, DragOverlay } from "@dnd-kit/core";
import React from "react";
import { LoremIpsum } from "lorem-ipsum";
import "./App.css";
import {
  SortableList,
  SortableItemOverlay,
} from "./components/Sortable";
import {
  DraggableItemContext,
  Item,
  Lane,
  SortableDirection,
} from "./components/types";
import { ItemContent, LaneContent, SortableLane } from "./components/Presentation";
import {
  useCustomCollisionDetection,
  useDragHandlers,
} from "./components/helpers";
import { createPortal } from "react-dom";

function generateInstanceId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function generateItems(n: number) {
  const items: Item[] = [];
  const l = new LoremIpsum();

  for (let i = 0; i < n; i++) {
    items.push({
      id: generateInstanceId(),
      title: l.generateSentences(1),
    });
  }

  return items;
}

function generateLanes(n: number) {
  const lanes: Lane[] = [];
  const l = new LoremIpsum();

  for (let i = 0; i < n; i++) {
    lanes.push({
      id: generateInstanceId(),
      title: l.generateWords(3),
      items: generateItems(20),
    });
  }

  return lanes;
}

const TEST_BOARD = generateLanes(8);

function useBoardData() {
  const laneState = React.useState<Lane[]>(TEST_BOARD);
  const clonedLaneState = React.useState<Lane[] | null>(null);

  const activeLaneState =
    React.useState<DraggableItemContext<Lane> | null>(null);
  const activeItemState =
    React.useState<DraggableItemContext<Item> | null>(null);

  return {
    laneState,
    clonedLaneState,
    activeLaneState,
    activeItemState,
  };
}

function App() {
  const { laneState, clonedLaneState, activeLaneState, activeItemState } =
    useBoardData();

  const { onDragStart, onDragCancel, onDragOver, onDragEnd } = useDragHandlers({
    laneState,
    clonedLaneState,
    activeLaneState,
    activeItemState,
  });

  const lanes = laneState[0];
  const activeLane = activeLaneState[0];
  const activeItem = activeItemState[0];

  const collisionDetection = useCustomCollisionDetection(
    laneState[0],
    activeLane
  );

  let activeDrag = null;

  if (activeLane) {
    activeDrag = (
      <SortableItemOverlay
        id={activeLane.data.id}
        ctx={activeLane}
        className="lane"
      >
        <LaneContent lane={activeLane.data} isOverlay={true} />
      </SortableItemOverlay>
    );
  } else if (activeItem) {
    activeDrag = (
      <SortableItemOverlay
        id={activeItem.data.id}
        ctx={activeItem}
        className="item"
      >
        <ItemContent item={activeItem.data} />
      </SortableItemOverlay>
    );
  }

  return (
    <>
      <div className="app-header">Lorem Ipsum</div>
      <div className="app">
        <DndContext
          onDragStart={onDragStart}
          onDragCancel={onDragCancel}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          collisionDetection={collisionDetection}
        >
          <SortableList
            className="board"
            list={lanes}
            id="base"
            accepts="lane"
            direction={SortableDirection.Horizontal}
            ctx={{
              indexPath: [],
            }}
          >
            {lanes.map((lane, i) => (
              <SortableLane key={lane.id} lane={lane} laneIndex={i} />
            ))}
          </SortableList>
          {createPortal(<DragOverlay>{activeDrag}</DragOverlay>, document.body)}
        </DndContext>
      </div>
    </>
  );
}

export default App;
