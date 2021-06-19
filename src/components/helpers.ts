import update from "immutability-helper";
import React from "react";
import {
  closestCorners,
  CollisionDetection,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableItemContext, Item, Lane, SortableDirection } from "./types";

export type MapAny = { [k: string]: any };

export function areArraysEqual(a: any[], b: any[]) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
}

function is(x: any, y: any): boolean {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    // eslint-disable-next-line
    return x !== x && y !== y;
  }
}

type CustomComparator = (k: string, a: any, b: any) => boolean;

export function shallowEqual(
  objA: MapAny,
  objB: MapAny,
  customCompare: CustomComparator = () => false
): boolean {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(objB, keysA[i])) {
      return false;
    }
    if (
      !is(objA[keysA[i]], objB[keysA[i]]) &&
      !customCompare(keysA[i], objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

export function areEqualWithIndexPath(objA: MapAny, objB: MapAny) {
  return shallowEqual(objA, objB, (k, a, b) => {
    if (k === "indexPath") {
      return areArraysEqual(a, b);
    }

    return false;
  });
}

export function areEqualWithCtx(objA: MapAny, objB: MapAny) {
  return shallowEqual(objA, objB, (k, a, b) => {
    if (k === "ctx") {
      return areEqualWithIndexPath(a, b);
    }

    return false;
  });
}

export function getStrategy(direction: SortableDirection) {
  switch (direction) {
    case SortableDirection.Horizontal:
      return horizontalListSortingStrategy;
    case SortableDirection.Vertical:
      return verticalListSortingStrategy;
  }
}

export function dragToEmptyLane(
  source: DraggableItemContext<Item>,
  destination: DraggableItemContext<Lane>
) {
  const [sourceLaneIndex, sourceItemIndex] = source.indexPath;
  const [destinationLaneIndex] = destination.indexPath;

  // Same list
  if (sourceLaneIndex === destinationLaneIndex) {
    return;
  }

  return (lanes: Lane[]) => {
    return update(lanes, {
      [sourceLaneIndex]: {
        items: {
          $splice: [[sourceItemIndex, 1]],
        },
      },
      [destinationLaneIndex]: {
        items: {
          $unshift: [lanes[sourceLaneIndex].items[sourceItemIndex]],
        },
      },
    });
  };
}

export function dragToPopulatedLane(
  lanes: Lane[],
  source: DraggableItemContext<Item>,
  destination: DraggableItemContext<Item>
) {
  const [sourceListIndex, sourceItemIndex] = source.indexPath;
  const [destinationListIndex, destinationItemIndex] = destination.indexPath;

  const destinationList = lanes[destinationListIndex];
  const sourceList = lanes[sourceListIndex];

  if (!sourceList || !destinationList || sourceList === destinationList) {
    return;
  }

  if (sourceList !== destinationList) {
    return (lanes: Lane[]) => {
      return update(lanes, {
        [sourceListIndex]: {
          items: {
            $splice: [[sourceItemIndex, 1]],
          },
        },
        [destinationListIndex]: {
          items: {
            $splice: [[destinationItemIndex, 0, source.data]],
          },
        },
      });
    };
  }
}

export function useDragHandlers({
  laneState,
  clonedLaneState,
  activeLaneState,
  activeItemState,
}: {
  laneState: [Lane[], React.Dispatch<React.SetStateAction<Lane[]>>];
  clonedLaneState: [
    Lane[] | null,
    React.Dispatch<React.SetStateAction<Lane[] | null>>
  ];
  activeLaneState: [
    DraggableItemContext<Lane> | null,
    React.Dispatch<React.SetStateAction<DraggableItemContext<Lane> | null>>
  ];
  activeItemState: [
    DraggableItemContext<Item> | null,
    React.Dispatch<React.SetStateAction<DraggableItemContext<Item> | null>>
  ];
}) {
  const [lanes, setLanes] = laneState;
  const [clonedLanes, setClonedLanes] = clonedLaneState;
  const [activeLane, setActiveLane] = activeLaneState;
  const [activeItem, setActiveItem] = activeItemState;

  const onDragStart = React.useCallback(
    (e: DragStartEvent) => {
      const activeData = e.active.data.current;

      if (activeData?.type === "lane") {
        const laneData = activeData as DraggableItemContext<Lane>;
        setActiveLane(laneData);
      } else if (activeData?.type === "item") {
        const itemData = activeData as DraggableItemContext<Item>;
        setActiveItem(itemData);
        setClonedLanes(lanes);
      }
    },
    [lanes, setActiveLane, setActiveItem, setClonedLanes]
  );

  const onDragCancel = React.useCallback(() => {
    if (activeLane) setActiveLane(null);
    if (activeItem) setActiveItem(null);
    if (clonedLanes) {
      setLanes(clonedLanes);
      setClonedLanes(null);
    }
  }, [
    clonedLanes,
    activeLane,
    activeItem,
    setActiveLane,
    setActiveItem,
    setLanes,
    setClonedLanes,
  ]);

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
      const mutation = dragToPopulatedLane(lanes, source, destination);

      if (mutation) {
        return setLanes(mutation);
      }
    },
    [lanes, clonedLanes, setLanes]
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
    [
      activeItem,
      activeLane,
      clonedLanes,
      setLanes,
      setActiveLane,
      setActiveItem,
      setClonedLanes,
    ]
  );

  return {
    onDragEnd,
    onDragOver,
    onDragStart,
    onDragCancel,
  };
}

export function useCustomCollisionDetection(
  lanes: Lane[],
  activeLane: DraggableItemContext<Lane> | null
) {
  const laneIds = React.useMemo(
    () =>
      lanes.reduce<{ [id: string]: true }>((mapped, lane) => {
        mapped[lane.id] = true;
        return mapped;
      }, {}),
    [lanes]
  );

  return React.useCallback<CollisionDetection>(
    (entries, target) => {
      if (activeLane) {
        // Lanes can only collide with lanes
        return closestCorners(
          entries.filter((entry) => {
            return !!laneIds[entry[0]];
          }),
          target
        );
      }

      // Items can only collide with items
      return closestCorners(
        entries.filter((entry) => {
          return !laneIds[entry[0]];
        }),
        target
      );
    },
    [laneIds, activeLane]
  );
}
