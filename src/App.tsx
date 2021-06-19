import update from "immutability-helper";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import React from "react";
import "./App.css";
import {
  SortableList,
  SortableItem,
  SortableItemOverlay,
} from "./components/SortableList";
import { DraggableItemContext, Item, Lane, SortableDirection } from "./components/types";
import { dragToEmptyLane, dragToPopulatedLane } from "./components/helpers";
import { ItemContent, LaneContent } from "./components/Presentation";

function App() {
  const [lanes, setLanes] = React.useState<Lane[]>([
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
  ]);
  const [clonedLanes, setClonedLanes] = React.useState<Lane[] | null>(null);

  const [activeLane, setActiveLane] =
    React.useState<DraggableItemContext<Lane> | null>(null);
  const [activeItem, setActiveItem] =
    React.useState<DraggableItemContext<Item> | null>(null);

  const sensors = useSensors(
    // useSensor(MouseSensor),
    useSensor(PointerSensor)
    // useSensor(KeyboardSensor)
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

  const onDragStart = React.useCallback(
    (e: DragStartEvent) => {
      const activeData = e.active.data.current;

      if (activeData?.type === "lane") {
        const laneData = activeData as DraggableItemContext<Lane>;
        setActiveLane(laneData);
      } else if (activeData?.type === "item") {
        const itemData = activeData as DraggableItemContext<Lane>;
        setActiveItem(itemData);
        setClonedLanes(lanes);
      }
    },
    [lanes]
  );

  const onDragCancel = React.useCallback(() => {
    if (activeLane) setActiveLane(null);
    if (activeItem) setActiveItem(null);
    if (clonedLanes) {
      setLanes(clonedLanes);
      setClonedLanes(null);
    }
  }, [clonedLanes, activeLane, activeItem]);

  const onDragOver = React.useCallback(
    ({ active, over }: DragEndEvent) => {
      const activeData = active.data.current;
      const overData = over?.data.current;

      if (activeData?.type !== "item") {
        return;
      }

      if (!over) {
        if (clonedLanes) {
          setLanes(clonedLanes);
        }

        return;
      }

      const source = activeData as DraggableItemContext<Item>;

      if (overData?.type === "lane") {
        const destination = overData as DraggableItemContext<Lane>;
        const mutation = dragToEmptyLane(source, destination);

        if (mutation) {
          return setLanes(mutation);
        }
      }

      const destination = overData as DraggableItemContext<Item>;
      const mutation = dragToPopulatedLane(
        lanes,
        source,
        destination,
        active,
        over
      );

      if (mutation) {
        return setLanes(mutation);
      }
    },
    [lanes, clonedLanes]
  );

  const onDragEnd = React.useCallback(
    ({ active, over }: DragEndEvent) => {
      const activeData = active?.data.current;
      const overData = over?.data.current;

      if (!over) {
        if (clonedLanes) {
          setLanes(clonedLanes);
          setClonedLanes(null);
        }
        return;
      }

      if (overData?.type === "lane" && activeData?.type === "lane") {
        // Sorting lanes
        const destination = overData as DraggableItemContext<Lane>;
        const [sourceListIndex] = activeData.indexPath;
        const [destinationListIndex] = destination.indexPath;

        if (sourceListIndex !== destinationListIndex) {
          setLanes((lanes) =>
            arrayMove(lanes, sourceListIndex, destinationListIndex)
          );
        }
      } else if (overData?.type === "lane" && activeData?.type === "item") {
        // Adding item to lane
        const destination = overData as DraggableItemContext<Lane>;
        const [sourceListIndex, sourceIndex] = activeData.indexPath;
        const [destinationListIndex] = destination.indexPath;

        // Same list
        if (sourceListIndex === destinationListIndex) {
          return;
        }

        return setLanes((lanes) => {
          return update(lanes, {
            [sourceListIndex]: {
              items: {
                $splice: [[sourceIndex, 1]],
              },
            },
            [destinationListIndex]: {
              items: {
                $unshift: [lanes[sourceListIndex].items[sourceIndex]],
              },
            },
          });
        });
      } else if (overData?.type === "item" && activeData?.type === "item") {
        // Sorting items
        const itemData = overData as DraggableItemContext<Item>;
        const [sourceListIndex, sourceItemIndex] = activeData.indexPath;
        const [destinationListIndex, destinationItemIndex] = itemData.indexPath;

        if (
          sourceListIndex === destinationListIndex &&
          sourceItemIndex !== destinationItemIndex
        ) {
          setLanes((lanes) => {
            return update(lanes, {
              [destinationListIndex]: {
                items: {
                  $set: arrayMove(
                    lanes[destinationListIndex].items,
                    sourceItemIndex,
                    destinationItemIndex
                  ),
                },
              },
            });
          });
        }
      }

      if (activeLane) setActiveLane(null);
      if (activeItem) setActiveItem(null);
      if (clonedLanes) setClonedLanes(null);
    },
    [activeItem, activeLane, clonedLanes]
  );

  return (
    <div className="App">
      <DndContext
        onDragStart={onDragStart}
        onDragCancel={onDragCancel}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        sensors={sensors}
        collisionDetection={closestCorners}
      >
        <SortableList
          list={lanes}
          id="base"
          accepts="lane"
          direction={SortableDirection.Horizontal}
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
