import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import React from "react";
import "./App.css";
import {
  SortableList,
  SortableDirection,
  SortableItem,
  SortableItemOverlay,
  DraggableItemContext,
  SortableListOverlay,
} from "./SortableList";

interface Item {
  id: string;
  title: string;
}

interface ItemContentProps {
  item: Item;
}

function ItemContent({ item }: ItemContentProps) {
  return <div>{item.title}</div>;
}

interface Lane {
  id: string;
  title: string;
  items: Item[];
}

interface LaneContentProps {
  lane: Lane;
  indexPath?: number[];
}

function LaneContent({ lane, indexPath }: LaneContentProps) {
  return (
    <div>
      <div className="lane-title">{lane.title}</div>
      {indexPath ? (
        <SortableList
          list={lane.items}
          id={lane.id}
          accepts="item"
          direction={SortableDirection.Vertical}
        >
          {lane.items.map((item, i) => (
            <SortableItem
              className="item"
              data={{
                type: "item",
                containingListId: lane.id,
                indexPath: [...indexPath, i],
                data: item,
              }}
              key={item.id}
              id={item.id}
            >
              <ItemContent item={item} />
            </SortableItem>
          ))}
        </SortableList>
      ) : (
        <SortableListOverlay
          list={lane.items}
          id={lane.id}
          accepts="item"
          direction={SortableDirection.Vertical}
        >
          {lane.items.map((item, i) => (
            <SortableItemOverlay
              className="item"
              data={{
                type: "item",
                containingListId: lane.id,
                indexPath: [i],
                data: item,
              }}
              key={item.id}
              id={item.id}
            >
              <ItemContent item={item} />
            </SortableItemOverlay>
          ))}
        </SortableListOverlay>
      )}
    </div>
  );
}

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
        { id: "2.2", title: "two.b" },
        { id: "3.2", title: "three.b" },
      ],
    },
    { id: "3", title: "three", items: [] },
  ]);

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
        data={activeLane}
        className="lane"
      >
        <LaneContent lane={activeLane.data} />
      </SortableItemOverlay>
    );
  } else if (activeItem) {
    activeDrag = (
      <SortableItemOverlay
        id={activeItem.data.id}
        data={activeItem}
        className="item"
      >
        <ItemContent item={activeItem.data} />
      </SortableItemOverlay>
    );
  }

  return (
    <div className="App">
      <DndContext
        onDragStart={(e) => {
          const activeData = e.active.data.current;

          if (activeData?.type === "lane") {
            const laneData = activeData as DraggableItemContext<Lane>;
            setActiveLane(laneData);
          } else if (activeData?.type === "item") {
            const itemData = activeData as DraggableItemContext<Lane>;
            setActiveItem(itemData);
          }
        }}
        onDragCancel={(e) => {
          if (activeLane) setActiveLane(null);
          if (activeItem) setActiveItem(null);
        }}
        onDragEnd={(e) => {
          const overData = e.over?.data.current;

          if (overData?.type === "lane") {
            const laneData = overData as DraggableItemContext<Lane>;

            if (
              activeLane &&
              activeLane.indexPath[0] !== laneData.indexPath[0]
            ) {
              setLanes((lanes) =>
                arrayMove(lanes, activeLane.indexPath[0], laneData.indexPath[0])
              );
            }
          } else if (overData?.type === "item") {
            // const itemData = activeData as DraggableItemContext<Lane>;
            // setActiveItem(itemData);
          }

          if (e.over) {
          }

          if (activeLane) setActiveLane(null);
          if (activeItem) setActiveItem(null);
        }}
        sensors={sensors}
      >
        <SortableList
          list={lanes}
          id="row-1"
          accepts="lane"
          direction={SortableDirection.Horizontal}
        >
          {lanes.map((lane, i) => (
            <SortableItem
              className="lane"
              data={{
                type: "lane",
                containingListId: "row-1",
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
