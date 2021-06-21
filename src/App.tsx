import { DndContext, DragOverlay } from "@dnd-kit/core";
import React from "react";
import { LoremIpsum } from "lorem-ipsum";
import "./App.css";
import { Item, Lane } from "./components/types";
import { DraggableLane } from "./components/Lane";
import { CardContent } from "./components/Card";
import {
  DragDroppable,
  DragDroppableContext,
  DragDroppableList,
  DragDroppableOverlay,
} from "./alt/DragDroppable";
import { Dimensions, OverlayDimensionsContext } from "./alt/Context";
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
  const [lanes, setLanes] = React.useState<Lane[]>(TEST_BOARD);

  const [activeDrag, setActiveDrag] =
    React.useState<DragDroppableContext | null>(null);
  const activeDimensions = React.useRef<Dimensions | undefined>(undefined);

  let overlay = null;

  if (activeDrag?.type === "lane") {
    const lane = lanes[activeDrag.indexPath[0]];
    overlay = (
      <DragDroppableOverlay orientation="horizontal" className="lane">
        <DraggableLane
          isOverlay
          lane={lane}
          laneIndex={activeDrag.indexPath[0]}
        />
      </DragDroppableOverlay>
    );
  } else if (activeDrag?.type === "item") {
    const item =
      lanes[activeDrag.indexPath[0]].children[activeDrag.indexPath[1]];
    overlay = (
      <DragDroppableOverlay orientation="vertical" className="item">
        <CardContent item={item} />
      </DragDroppableOverlay>
    );
  }

  return (
    <OverlayDimensionsContext.Provider value={activeDimensions}>
      <div className="app-header">Lorem Ipsum</div>
      <div className="app">
        <DndContext
          onDragStart={(e) => {
            if (!e.active.data.current) {
              return;
            }

            console.log(e);

            activeDimensions.current = {
              width: e.active.rect.current.initial?.width || 0,
              height: e.active.rect.current.initial?.height || 0,
            };

            const active = e.active.data.current as DragDroppableContext;

            setActiveDrag(active);
          }}
          onDragCancel={() => {
            if (activeDrag) {
              setActiveDrag(null);
            }
          }}
          onDragOver={(e) => {
            activeDimensions.current = {
              width: e.active.rect.current.initial?.width || 0,
              height: e.active.rect.current.initial?.height || 0,
            };
          }}
          onDragEnd={() => {
            if (activeDrag) {
              setActiveDrag(null);
            }
          }}
        >
          <DragDroppableList className="board" orientation="horizontal">
            {lanes.map((lane, i) => (
              <DragDroppable
                className="lane"
                id={lane.id}
                indexPath={[i]}
                key={lane.id}
                orientation="horizontal"
                type="lane"
              >
                <DraggableLane key={lane.id} lane={lane} laneIndex={i} />
              </DragDroppable>
            ))}
          </DragDroppableList>
          {createPortal(<DragOverlay>{overlay}</DragOverlay>, document.body)}
        </DndContext>
      </div>
    </OverlayDimensionsContext.Provider>
  );
}

export default App;
