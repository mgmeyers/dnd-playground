import React from "react";
import classcat from "classcat";
import { moveEntity, TEST_BOARD } from "./util/data";
import { DndContext } from "./components/DndContext";
import { DragOverlay } from "./components/DragOverlay";
import { Scrollable } from "./components/Scrollable";
import { Droppable } from "./components/Droppable";
import { EntityData, Item, Lane } from "./types";
import { useDragHandle } from "./managers/DragManager";
import { Sortable } from "./components/Sortable";
import { SortPlaceholder } from "./components/SortPlaceholder";
// import { Debug, DebugScrollContainers } from "./Debug";

export function DragStage() {
  const [board, setBoard] = React.useState({
    children: TEST_BOARD,
    id: "board",
    type: "board",
    accepts: ["lane"],
    data: {},
  });

  // TODO: move this work into the scroll container via React.memo comparators
  const boardScrollTiggers = React.useRef(["lane", "item"]);
  const lanePlaceholderTigger = React.useRef(["lane"]);

  return (
    <DndContext
      onDrop={(dragEntity, dropEntity) => {
        const newBoard = moveEntity(
          board,
          dragEntity.getPath(),
          dropEntity.getPath()
        );

        setBoard(newBoard);
      }}
      id="1"
    >
      <div className="app">
        <div className="app-header">Lorem Ipsum</div>
        <div className="app-body">
          <ScrollContainer
            className="board horizontal"
            triggerTypes={boardScrollTiggers.current}
          >
            <Sortable axis="horizontal">
              <Lanes lanes={board.children} />
              <SortPlaceholder
                accepts={lanePlaceholderTigger.current}
                index={TEST_BOARD.length}
              />
            </Sortable>
          </ScrollContainer>
        </div>
      </div>
      <DragOverlay>
        {(_, styles) => (
          <>
            <div style={styles} className="hitbox">
              DRAG
            </div>
          </>
        )}
      </DragOverlay>
      {/* <Debug />
      <DebugScrollContainers /> */}
    </DndContext>
  );
}

const Items = React.memo(function Items({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((item, i) => {
        return <ItemComponent item={item} itemIndex={i} key={item.id} />;
      })}
    </>
  );
});

const ItemComponent = React.memo(function ItemComponent({
  item,
  itemIndex,
}: {
  item: Item;
  itemIndex: number;
}) {
  return (
    <DragDroppableContainer
      className="item"
      data={item}
      id={item.id}
      index={itemIndex}
    >
      {item.id}: {item.data.title}
    </DragDroppableContainer>
  );
});

const Lanes = React.memo(function Lanes({ lanes }: { lanes: Lane[] }) {
  return (
    <>
      {lanes.map((lane, i) => {
        return <LaneComponent lane={lane} laneIndex={i} key={lane.id} />;
      })}
    </>
  );
});

const LaneComponent = React.memo(function LaneComponent({
  lane,
  laneIndex,
}: {
  lane: Lane;
  laneIndex: number;
}) {
  const laneScrollTiggers = React.useRef(["item"]);

  return (
    <DragDroppableContainer
      className="lane"
      data={lane}
      id={lane.id}
      index={laneIndex}
      key={lane.id}
    >
      <div className="lane-title">
        {lane.id}: {lane.data.title}
      </div>
      <ScrollContainer
        className="lane-items vertical"
        triggerTypes={laneScrollTiggers.current}
      >
        <Sortable axis="vertical">
          <Items items={lane.children} />
          <SortPlaceholder
            accepts={laneScrollTiggers.current}
            index={lane.children.length}
          />
        </Sortable>
      </ScrollContainer>
    </DragDroppableContainer>
  );
});

interface ScrollContainerProps {
  children?: React.ReactNode;
  className?: string;
  triggerTypes: string[];
}

export function ScrollContainer({
  className,
  children,
  triggerTypes,
}: ScrollContainerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className={classcat([className, "scroll-container"])}>
      <Scrollable scrollRef={scrollRef} triggerTypes={triggerTypes}>
        {children}
      </Scrollable>
    </div>
  );
}

interface DragDroppableContainerProps {
  children?: React.ReactNode;
  className?: string;
  data: EntityData;
  id: string;
  index: number;
}

export function DragDroppableContainer({
  className,
  children,
  id,
  index,
  data,
}: DragDroppableContainerProps) {
  const dragRef = React.useRef<HTMLDivElement>(null);

  useDragHandle(dragRef, dragRef);

  return (
    <div ref={dragRef} className={className}>
      <Droppable elementRef={dragRef} id={id} index={index} data={data}>
        {children}
      </Droppable>
    </div>
  );
}
