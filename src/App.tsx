import { DndContext, DragOverlay } from "@dnd-kit/core";
import React from "react";
import { createPortal } from "react-dom";
import { LoremIpsum } from "lorem-ipsum";
import "./App.css";
import { DragContext, Item, Lane, Nestable } from "./alt/types";
import { DraggableLane } from "./alt/Lane";
import { CardContent } from "./alt/Card";
import { SortableList, DraggableOverlay, Sortable } from "./alt/DragDroppable";
import {
  Dimensions,
  OverlayDimensionsContext,
} from "./alt/Context";
import { getBoardFromDrag, getEntityFromPath } from "./alt/helpers";

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

function App() {
  const [board, setBoard] = React.useState<Nestable<{}, Lane>>({
    id: "board",
    type: "board",
    data: {},
    children: TEST_BOARD,
  });

  const [activeDrag, setActiveDrag] = React.useState<DragContext | null>(null);
  const dragDimensionsRef =
    React.useRef<Dimensions | undefined>(undefined);

  let overlay = null;

  if (activeDrag?.type === "lane") {
    const lane = getEntityFromPath(board, activeDrag.path) as Lane;
    overlay = (
      <DraggableOverlay
        orientation="horizontal"
        className="lane-wrapper"
      >
        <DraggableLane isOverlay lane={lane} laneIndex={activeDrag.path[0]} />
      </DraggableOverlay>
    );
  } else if (activeDrag?.type === "item") {
    const item = getEntityFromPath(board, activeDrag.path) as Item;
    overlay = (
      <DraggableOverlay
        orientation="vertical"
        className="item-wrapper"
      >
        <CardContent item={item} />
      </DraggableOverlay>
    );
  }

  return (
    <OverlayDimensionsContext.Provider value={dragDimensionsRef}>
        <div className="app-header">Lorem Ipsum</div>
        <div className="app">
          <DndContext
            onDragStart={({ active }) => {
              if (!active.data.current) {
                return;
              }

              setActiveDrag(active.data.current as DragContext);
            }}
            onDragCancel={() => {
              if (activeDrag) {
                setActiveDrag(null);
              }
            }}
            onDragOver={({ active }) => {
              dragDimensionsRef.current = {
                width: active.rect.current.initial?.width || 0,
                height: active.rect.current.initial?.height || 0,
              };
            }}
            onDragEnd={({ active, over }) => {
              const mutation = getBoardFromDrag(board, active, over);

              if (mutation) {
                setBoard(mutation);
              }

              if (activeDrag) {
                setActiveDrag(null);
              }
            }}
          >
            <SortableList className="board" orientation="horizontal">
              {board.children.map((lane, i) => (
                <Sortable
                  className="lane-wrapper"
                  id={lane.id}
                  path={[i]}
                  key={lane.id}
                  orientation="horizontal"
                  type="lane"
                >
                  <DraggableLane key={lane.id} lane={lane} laneIndex={i} />
                </Sortable>
              ))}
            </SortableList>
            {createPortal(<DragOverlay className="drag-overlay">{overlay}</DragOverlay>, document.body)}
          </DndContext>
        </div>
    </OverlayDimensionsContext.Provider>
  );
}

export default App;
