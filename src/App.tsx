import { DndContext, DragOverlay } from "@dnd-kit/core";
import React from "react";
import "./App.css";
import {
  SortableList,
  SortableItem,
  SortableItemOverlay,
} from "./components/Sortable";
import {
  DraggableItemContext,
  Item,
  Lane,
  SortableDirection,
} from "./components/types";
import { ItemContent, LaneContent } from "./components/Presentation";
import {
  useCustomCollisionDetection,
  useDragHandlers,
} from "./components/helpers";

const TEST_BOARD = [
  {
    id: "1",
    title: "one",
    items: [
      { id: "1.1", title: "one.a" },
      { id: "2.1", title: "two.a" },
      { id: "3.1", title: "three.a" },
    ],
  },
  {
    id: "2",
    title: "two",
    items: [
      { id: "1.2", title: "one.b" },
      {
        id: "2.2",
        title:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur efficitur purus in commodo tristique. Sed ante sem, consequat quis arcu vitae, pretium dapibus augue.",
      },
      { id: "3.2", title: "three.b" },
    ],
  },
  { id: "3", title: "three", items: [] },
];

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
    <div className="App">
      <DndContext
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        collisionDetection={collisionDetection}
      >
        <SortableList
          list={lanes}
          id="base"
          accepts="lane"
          direction={SortableDirection.Horizontal}
          ctx={{
            indexPath: [],
          }}
        >
          {lanes.map((lane, i) => (
            <SortableItem
              className="lane"
              ctx={{
                type: "lane",
                containingListId: "base",
                indexPath: [i],
                data: lane,
              }}
              key={lane.id}
              id={lane.id}
            >
              <LaneContent indexPath={[i]} lane={lane} />
            </SortableItem>
          ))}
        </SortableList>
        <DragOverlay>{activeDrag}</DragOverlay>
      </DndContext>
    </div>
  );
}

export default App;
