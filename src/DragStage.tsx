import React from "react";
import classcat from "classcat";
import { moveEntity, TEST_BOARD } from "./util/data";
import { DndContext } from "./components/DndContext";
import { DragOverlay } from "./components/DragOverlay";
import { Scrollable } from "./components/Scrollable";
import { Droppable } from "./components/Droppable";
import { Entity, EntityData, Item, Lane } from "./types";
import { useDragHandle } from "./managers/DragManager";
import { Sortable } from "./components/Sortable";
import { SortPlaceholder } from "./components/SortPlaceholder";
import { Debug, DebugScrollContainers } from "./Debug";

export function DragStage() {
  const [board, setBoard] = React.useState({
    children: TEST_BOARD,
    id: "board",
    type: "board",
    accepts: ["lane"],
    data: {},
  });

  // TODO: move this work into the scroll container via React.memo comparators
  const boardScrollTiggers = React.useMemo(() => ["lane", "item"], []);
  const lanePlaceholderTigger = React.useMemo(() => ["lane"], []);
  const onDrop = React.useCallback((dragEntity: Entity, dropEntity: Entity) => {
    setBoard((board) =>
      moveEntity(board, dragEntity.getPath(), dropEntity.getPath())
    );
  }, []);

  return (
    <DndContext onDrop={onDrop} id="1">
      <div className="app">
        <div className="app-header">Lorem Ipsum</div>
        <div className="app-body">
          <ScrollContainer
            className="board horizontal"
            triggerTypes={boardScrollTiggers}
          >
            <Sortable axis="horizontal">
              <Lanes lanes={board.children} />
              <SortPlaceholder
                accepts={lanePlaceholderTigger}
                index={TEST_BOARD.length}
              />
            </Sortable>
          </ScrollContainer>
        </div>
      </div>
      <DragOverlay>
        {(entity, styles) => {
          const data = entity.getData();

          if (data.type === "lane") {
            return (
              <div style={styles}>
                <LaneComponent
                  lane={data as Lane}
                  laneIndex={0}
                  isStatic={true}
                />
              </div>
            );
          }

          if (data.type === "item") {
            return (
              <div style={styles}>
                <ItemComponent
                  item={data as Item}
                  itemIndex={0}
                  isStatic={true}
                />
              </div>
            );
          }

          return <div />;
        }}
      </DragOverlay>
      <Debug />
      {/* <DebugScrollContainers /> */}
    </DndContext>
  );
}

const Items = React.memo(function Items({
  items,
  isStatic,
}: {
  items: Item[];
  isStatic?: boolean;
}) {
  return (
    <>
      {items.map((item, i) => {
        return (
          <ItemComponent
            item={item}
            itemIndex={i}
            key={item.id}
            isStatic={isStatic}
          />
        );
      })}
    </>
  );
});

const ItemComponent = React.memo(function ItemComponent({
  item,
  itemIndex,
  isStatic,
}: {
  item: Item;
  itemIndex: number;
  isStatic?: boolean;
}) {
  return (
    <DragDroppableContainer
      className="item"
      wrapperClassName="item-wrapper"
      data={item}
      id={item.id}
      index={itemIndex}
      isStatic={isStatic}
    >
      {item.id}: {item.data.title}
    </DragDroppableContainer>
  );
});

const Lanes = React.memo(function Lanes({
  lanes,
  isStatic,
}: {
  lanes: Lane[];
  isStatic?: boolean;
}) {
  return (
    <>
      {lanes.map((lane, i) => {
        return (
          <LaneComponent
            lane={lane}
            laneIndex={i}
            key={lane.id}
            isStatic={isStatic}
          />
        );
      })}
    </>
  );
});

const LaneComponent = React.memo(function LaneComponent({
  lane,
  laneIndex,
  isStatic,
}: {
  lane: Lane;
  laneIndex: number;
  isStatic?: boolean;
}) {
  const laneScrollTiggers = React.useMemo(() => ["item"], []);

  const content = (
    <>
      <Items items={lane.children} isStatic={isStatic} />
      {!isStatic && (
        <SortPlaceholder
          accepts={laneScrollTiggers}
          index={lane.children.length}
        />
      )}
    </>
  );

  return (
    <DragDroppableContainer
      className="lane"
      wrapperClassName="lane-wrapper"
      data={lane}
      id={lane.id}
      index={laneIndex}
      isStatic={isStatic}
    >
      <div className="lane-title">
        {lane.id}: {lane.data.title}
      </div>
      <ScrollContainer
        className="lane-items vertical"
        triggerTypes={laneScrollTiggers}
        isStatic={isStatic}
      >
        {isStatic ? content : <Sortable axis="vertical">{content}</Sortable>}
      </ScrollContainer>
    </DragDroppableContainer>
  );
});

interface ScrollContainerProps {
  children?: React.ReactNode;
  className?: string;
  triggerTypes: string[];
  isStatic?: boolean;
}

export function ScrollContainer({
  className,
  children,
  triggerTypes,
  isStatic,
}: ScrollContainerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className={classcat([className, "scroll-container"])}>
      {isStatic ? (
        children
      ) : (
        <Scrollable scrollRef={scrollRef} triggerTypes={triggerTypes}>
          {children}
        </Scrollable>
      )}
    </div>
  );
}

interface DragDroppableContainerProps {
  children?: React.ReactNode;
  wrapperClassName?: string;
  className?: string;
  data: EntityData;
  id: string;
  index: number;
  isStatic?: boolean;
}

export function DragDroppableContainer({
  wrapperClassName,
  className,
  children,
  id,
  index,
  data,
  isStatic,
}: DragDroppableContainerProps) {
  const elementRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);

  useDragHandle(measureRef, measureRef);

  return (
    <div ref={measureRef} className={wrapperClassName}>
      <div ref={elementRef} className={className}>
        {isStatic ? (
          children
        ) : (
          <Droppable
            elementRef={elementRef}
            measureRef={measureRef}
            id={id}
            index={index}
            data={data}
          >
            {children}
          </Droppable>
        )}
      </div>
    </div>
  );
}
