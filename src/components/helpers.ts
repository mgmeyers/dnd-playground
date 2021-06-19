import update from "immutability-helper";
import {
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableItemContext, Item, Lane, SortableDirection } from "./types";
import { Active } from "@dnd-kit/core";
import { Over } from "@dnd-kit/core";

export function arraysAreEqual(a: any[], b: any[]) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
}

export function ctxAreEqual<A, B>(
  a: DraggableItemContext<A>,
  b: DraggableItemContext<B>
) {
  return (
    a.type === b.type &&
    a.containingListId === b.containingListId &&
    arraysAreEqual(a.indexPath, b.indexPath) &&
    (a.data as any) === (b.data as any)
  );
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
  const sourceIndex = source.indexPath[1];

  // Same list
  if (source.indexPath[0] === destination.indexPath[0]) {
    return;
  }

  return (lanes: Lane[]) => {
    return update(lanes, {
      [source.indexPath[0]]: {
        items: {
          $splice: [[sourceIndex, 1]],
        },
      },
      [destination.indexPath[0]]: {
        items: {
          $push: [source.data],
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
