import React from "react";
import { moveEntity, TEST_BOARD } from "./util/data";
import { DndContext } from "./components/DndContext";
import { DragOverlay } from "./components/DragOverlay";
import { Droppable } from "./components/Droppable";
import { Entity, Item, Lane } from "./types";
import { useDragHandle } from "./managers/DragManager";
import { Sortable } from "./components/Sortable";
import { SortPlaceholder } from "./components/SortPlaceholder";
import { ScrollContainer } from "./components/ScrollContainer";

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
            id="lanes"
            className="board horizontal"
            triggerTypes={boardScrollTiggers}
          >
            <Sortable axis="horizontal">
              <Lanes lanes={board.children} />
              <SortPlaceholder
                className="lane-placeholder"
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
      {/* <Debug /> */}
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
  const elementRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);

  useDragHandle(measureRef, measureRef);

  return (
    <div ref={measureRef} className="item-wrapper">
      <div ref={elementRef} className="item">
        {isStatic ? (
          `${item.id}: ${item.data.title}`
        ) : (
          <Droppable
            elementRef={elementRef}
            measureRef={measureRef}
            id={item.id}
            index={itemIndex}
            data={item}
          >
            {item.id}: {item.data.title}
          </Droppable>
        )}
      </div>
    </div>
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
  const handleRef = React.useRef<HTMLDivElement>(null);
  const elementRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);

  useDragHandle(measureRef, handleRef);

  const laneContent = (
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

  const laneBody = (
    <ScrollContainer
      id={lane.id}
      index={laneIndex}
      className="lane-items vertical"
      triggerTypes={laneScrollTiggers}
      isStatic={isStatic}
    >
      {isStatic ? (
        laneContent
      ) : (
        <Sortable axis="vertical">{laneContent}</Sortable>
      )}
    </ScrollContainer>
  );

  return (
    <div ref={measureRef} className="lane-wrapper">
      <div ref={elementRef} className="lane">
        <div className="lane-title">
          <div ref={handleRef} className="lane-drag-handle">
            |||
          </div>
          {lane.id}: {lane.data.title}
        </div>
        {isStatic ? (
          laneBody
        ) : (
          <Droppable
            elementRef={elementRef}
            measureRef={measureRef}
            id={lane.id}
            index={laneIndex}
            data={lane}
          >
            {laneBody}
          </Droppable>
        )}
      </div>
    </div>
  );
});
