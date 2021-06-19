import { DndContext, DragOverlay } from "@dnd-kit/core";
import React from "react";
import { LoremIpsum } from "lorem-ipsum";
import "./App.css";
import { SortableItemOverlay } from "./components/SortableItem";
import { DragContext, Item, Lane, SortableDirection } from "./components/types";
import { LaneContent, SortableLane } from "./components/Lane";
import {
  useCustomCollisionDetection,
  useDragHandlers,
} from "./components/helpers";
import { createPortal } from "react-dom";
import { SortableList } from "./components/SortableList";
import { CardContent } from "./components/Card";

function generateInstanceId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function generateItems(n: number) {
  const items: Item[] = [];
  const l = new LoremIpsum();

  for (let i = 0; i < n; i++) {
    items.push({
      id: generateInstanceId(),
      type: "item",
      data: {
        title: l.generateSentences(1),
      },
      children: [],
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
      type: "lane",
      data: {
        title: l.generateWords(3),
      },
      children: generateItems(20),
    });
  }

  return lanes;
}

const TEST_BOARD = generateLanes(8);

function useBoardData() {
  const laneState = React.useState<Lane[]>(TEST_BOARD);
  const clonedLaneState = React.useState<Lane[] | null>(null);

  const activeLaneState = React.useState<DragContext<Lane> | null>(null);
  const activeItemState = React.useState<DragContext<Item> | null>(null);

  return {
    laneState,
    clonedLaneState,
    activeLaneState,
    activeItemState,
  };
}

const rootContext = {
  parentId: null,
  indexPath: [],
  data: {},
};

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
      <SortableItemOverlay ctx={activeLane} className="lane">
        <LaneContent
          parentId={activeLane.parentId as string}
          lane={activeLane.data}
          indexPath={activeLane.indexPath}
          isOverlay={true}
        />
      </SortableItemOverlay>
    );
  } else if (activeItem) {
    activeDrag = (
      <SortableItemOverlay ctx={activeItem} className="item">
        <CardContent item={activeItem.data} />
      </SortableItemOverlay>
    );
  }

  const rootContent = React.useMemo(() => {
    return {
      id: "root",
      type: "root",
      children: lanes,
      data: {},
    };
  }, [lanes]);

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
            accepts="lane"
            direction={SortableDirection.Horizontal}
            content={rootContent}
            ctx={rootContext}
          >
            {lanes.map((lane, i) => (
              <SortableLane
                key={lane.id}
                parentId="root"
                lane={lane}
                laneIndex={i}
              />
            ))}
          </SortableList>
          {createPortal(<DragOverlay>{activeDrag}</DragOverlay>, document.body)}
        </DndContext>
      </div>
    </>
  );
}

export default App;
