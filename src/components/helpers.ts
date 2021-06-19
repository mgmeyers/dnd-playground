import update from "immutability-helper";
import {
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableItemContext, Item, Lane, SortableDirection } from "./types";
import { Active } from "@dnd-kit/core";
import { Over } from "@dnd-kit/core";

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
  destination: DraggableItemContext<Item>,
  active: Active,
  over: Over
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
      let newIndex: number;

      const isBelowLastItem =
        destinationItemIndex === destinationList.items.length - 1 &&
        active.rect.current.translated &&
        active.rect.current.translated.offsetTop >
          over.rect.offsetTop + over.rect.height;

      const modifier = isBelowLastItem ? 1 : 0;

      newIndex =
        destinationItemIndex >= 0
          ? destinationItemIndex + modifier
          : destinationList.items.length + 1;

      return update(lanes, {
        [sourceListIndex]: {
          items: {
            $splice: [[sourceItemIndex, 1]],
          },
        },
        [destinationListIndex]: {
          items: {
            $splice: [[newIndex, 0, source.data]],
          },
        },
      });
    };
  }
}
