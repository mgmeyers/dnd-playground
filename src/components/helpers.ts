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
} from "@dnd-kit/sortable";
import {
  DragContext,
  Item,
  Lane,
  NestableProps,
} from "./types";

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

export function dragToEmptyLane(
  source: DragContext<Item>,
  destination: DragContext<Lane>
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
        children: {
          $splice: [[sourceItemIndex, 1]],
        },
      },
      [destinationLaneIndex]: {
        children: {
          $unshift: [lanes[sourceLaneIndex].children[sourceItemIndex]],
        },
      },
    });
  };
}

export function dragToPopulatedLane(
  lanes: Lane[],
  source: DragContext<Item>,
  destination: DragContext<Item>
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
          children: {
            $splice: [[sourceItemIndex, 1]],
          },
        },
        [destinationListIndex]: {
          children: {
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
    DragContext<Lane> | null,
    React.Dispatch<React.SetStateAction<DragContext<Lane> | null>>
  ];
  activeItemState: [
    DragContext<Item> | null,
    React.Dispatch<React.SetStateAction<DragContext<Item> | null>>
  ];
}) {
  const [lanes, setLanes] = laneState;
  const [clonedLanes, setClonedLanes] = clonedLaneState;
  const [activeLane, setActiveLane] = activeLaneState;
  const [activeItem, setActiveItem] = activeItemState;

  const onDragStart = React.useCallback(
    (e: DragStartEvent) => {
      const active = e.active.data.current as DragContext<NestableProps>;

      if (active?.data.type === "lane") {
        const laneData = active as DragContext<Lane>;
        setActiveLane(laneData);
      } else if (active?.data.type === "item") {
        const itemData = active as DragContext<Item>;
        setActiveItem(itemData);
        setClonedLanes(lanes);
      }
    },
    [
      lanes,
      // These don't change, but tslint complains
      setActiveLane,
      setActiveItem,
      setClonedLanes,
    ]
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
    // These don't change, but tslint complains
    setActiveLane,
    setActiveItem,
    setLanes,
    setClonedLanes,
  ]);

  const onDragOver = React.useCallback(
    (e: DragEndEvent) => {
      const active = e.active.data.current as DragContext<NestableProps>;
      const over = e.over?.data.current as DragContext<NestableProps>;

      if (active.data.type !== "item") {
        return;
      }

      if (!over) {
        if (clonedLanes) {
          setLanes(clonedLanes);
        }

        return;
      }

      const source = active as DragContext<Item>;

      if (over.data.type === "lane") {
        const destination = over as DragContext<Lane>;
        const mutation = dragToEmptyLane(source, destination);

        if (mutation) {
          return setLanes(mutation);
        }
      }

      const destination = over as DragContext<Item>;
      const mutation = dragToPopulatedLane(lanes, source, destination);

      if (mutation) {
        return setLanes(mutation);
      }
    },
    [
      lanes,
      clonedLanes,
      // These don't change, but tslint complains
      setLanes,
    ]
  );

  const onDragEnd = React.useCallback(
    (e: DragEndEvent) => {
      const active = e.active.data.current as DragContext<NestableProps>;
      const over = e.over?.data.current as DragContext<NestableProps>;

      if (!over) {
        if (clonedLanes) {
          setLanes(clonedLanes);
          setClonedLanes(null);
        }

        if (activeLane) setActiveLane(null);
        if (activeItem) setActiveItem(null);

        return;
      }

      if (over.data.type === "lane" && active.data.type === "lane") {
        // Sorting lanes
        const destination = over as DragContext<Lane>;
        const [sourceListIndex] = active.indexPath;
        const [destinationListIndex] = destination.indexPath;

        if (sourceListIndex !== destinationListIndex) {
          setLanes((lanes) =>
            arrayMove(lanes, sourceListIndex, destinationListIndex)
          );
        }
      } else if (over.data.type === "lane" && active.data.type === "item") {
        // Adding item to lane
        const destination = over as DragContext<Lane>;
        const [sourceListIndex, sourceIndex] = active.indexPath;
        const [destinationListIndex] = destination.indexPath;

        // Same list
        if (sourceListIndex === destinationListIndex) {
          return;
        }

        return setLanes((lanes) => {
          return update(lanes, {
            [sourceListIndex]: {
              children: {
                $splice: [[sourceIndex, 1]],
              },
            },
            [destinationListIndex]: {
              children: {
                $unshift: [lanes[sourceListIndex].children[sourceIndex]],
              },
            },
          });
        });
      } else if (over.data.type === "item" && active.data.type === "item") {
        // Sorting items
        const itemData = over as DragContext<Item>;
        const [sourceListIndex, sourceItemIndex] = active.indexPath;
        const [destinationListIndex, destinationItemIndex] = itemData.indexPath;

        if (
          sourceListIndex === destinationListIndex &&
          sourceItemIndex !== destinationItemIndex
        ) {
          setLanes((lanes) => {
            return update(lanes, {
              [destinationListIndex]: {
                children: {
                  $set: arrayMove(
                    lanes[destinationListIndex].children,
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

      // These don't change, but tslint complains
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
  activeLane: DragContext<Lane> | null
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
