import { ScrollMotionValues } from "framer-motion";
import { Coordinates, Entity, Hitbox, Orientation, ScrollShift } from "./types";

export function numberOrZero(n?: number) {
  return n === undefined ? 0 : n;
}

export function noop() {}

export function calculateHitbox(
  rect: DOMRectReadOnly,
  scroll: ScrollMotionValues | null,
  scrollShift: ScrollShift | null
): Hitbox {
  return [
    // minx
    rect.left +
      numberOrZero(scroll?.scrollX.get()) +
      numberOrZero(scrollShift?.x),
    // miny
    rect.top +
      numberOrZero(scroll?.scrollY.get()) +
      numberOrZero(scrollShift?.y),

    // maxx
    rect.left +
      rect.width +
      numberOrZero(scroll?.scrollX.get()) +
      numberOrZero(scrollShift?.x),
    // maxy
    rect.top +
      rect.height +
      numberOrZero(scroll?.scrollY.get()) +
      numberOrZero(scrollShift?.y),
  ];
}

export function calculateScrollHitbox(
  rect: DOMRectReadOnly,
  scroll: ScrollMotionValues | null,
  scrollShift: ScrollShift | null,
  orientation: Orientation,
  side: "before" | "after"
): Hitbox {
  const hitbox = calculateHitbox(rect, scroll, scrollShift);

  if (orientation === "horizontal" && side === "before") {
    hitbox[2] = hitbox[0] + Math.min(30, Math.round(rect.width * 0.2));
    return hitbox;
  }

  if (orientation === "horizontal" && side === "after") {
    hitbox[0] =
      hitbox[0] + rect.width - Math.min(30, Math.round(rect.width * 0.2));
    return hitbox;
  }

  if (orientation === "vertical" && side === "before") {
    hitbox[3] = hitbox[1] + Math.min(30, Math.round(rect.height * 0.2));
    return hitbox;
  }

  hitbox[1] =
    hitbox[1] + rect.height - Math.min(30, Math.round(rect.height * 0.2));

  return hitbox;
}

export function adjustHitbox(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  scroll: ScrollMotionValues | null,
  scrollShift: ScrollShift | null
): Hitbox {
  return [
    minX - numberOrZero(scroll?.scrollX.get()) - numberOrZero(scrollShift?.x),
    minY - numberOrZero(scroll?.scrollY.get()) - numberOrZero(scrollShift?.y),
    maxX - numberOrZero(scroll?.scrollX.get()) - numberOrZero(scrollShift?.x),
    maxY - numberOrZero(scroll?.scrollY.get()) - numberOrZero(scrollShift?.y),
  ];
}

export const getMaxValueIndex = (array: number[]) =>
  getValueIndex(array, (value, tracked) => value > tracked);

export const getMinValueIndex = (array: number[]) =>
  getValueIndex(array, (value, tracked) => value < tracked);

export function getValueIndex(
  array: number[],
  comparator: (value: number, tracked: number) => boolean
) {
  if (array.length === 0) {
    return -1;
  }

  let tracked = array[0];
  let index = 0;

  for (var i = 1; i < array.length; i++) {
    if (comparator(array[i], tracked)) {
      index = i;
      tracked = array[i];
    }
  }

  return index;
}

function getIntersectionRatio(hitboxA: Hitbox, hitboxB: Hitbox): number {
  const aWidth = hitboxA[2] - hitboxA[0];
  const bWidth = hitboxB[2] - hitboxB[0];
  const aHeight = hitboxA[3] - hitboxA[1];
  const bHeight = hitboxB[3] - hitboxB[1];
  const top = Math.max(hitboxB[1], hitboxA[1]);
  const left = Math.max(hitboxB[0], hitboxA[0]);
  const right = Math.min(hitboxB[2], hitboxA[2]);
  const bottom = Math.min(hitboxB[3], hitboxA[3]);
  const width = right - left;
  const height = bottom - top;

  if (left < right && top < bottom) {
    const targetArea = bWidth * bHeight;
    const entryArea = aWidth * aHeight;
    const intersectionArea = width * height;
    const intersectionRatio =
      intersectionArea / (targetArea + entryArea - intersectionArea);

    return Number(intersectionRatio.toFixed(4));
  }

  return 0;
}

export function rectIntersection(entities: Entity[], target: Hitbox) {
  const intersections = entities.map((entity) =>
    getIntersectionRatio(entity.getHitbox(), target)
  );

  const maxValueIndex = getMaxValueIndex(intersections);

  if (intersections[maxValueIndex] <= 0) {
    return null;
  }

  return entities[maxValueIndex] ? entities[maxValueIndex] : null;
}

export function getScrollIntersection(
  entities: Entity[],
  target: Hitbox
): Array<[Entity, number]> {
  return entities.map((e) => {
    const orientation = e.getData().orientation as Orientation;
    const side = e.getData().side as "before" | "after";
    const hitbox = e.getHitbox();

    let index = 0;

    if (side === "before" && orientation === "horizontal") {
      index = 0;
    } else if (side === "after" && orientation === "horizontal") {
      index = 2;
    } else if (side === "before" && orientation === "vertical") {
      index = 1;
    } else if (side === "after" && orientation === "vertical") {
      index = 3;
    }

    return [e, Math.abs(target[index] - hitbox[index])];
  });
}

/**
 * Returns the coordinates of the corners of a given rectangle:
 * [TopLeft {x, y}, TopRight {x, y}, BottomLeft {x, y}, BottomRight {x, y}]
 */

function cornersOfRectangle(hitbox: Hitbox): Coordinates[] {
  return [
    {
      x: hitbox[0],
      y: hitbox[1],
    },
    {
      x: hitbox[2],
      y: hitbox[1],
    },
    {
      x: hitbox[0],
      y: hitbox[3],
    },
    {
      x: hitbox[2],
      y: hitbox[3],
    },
  ];
}

export function distanceBetween(p1: Coordinates, p2: Coordinates) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function closestCorners(entities: Entity[], target: Hitbox) {
  const corners = cornersOfRectangle(target);

  const distances = entities.map((entity) => {
    const entryCorners = cornersOfRectangle(entity.getHitbox());
    const distances = corners.reduce((accumulator, corner, index) => {
      return accumulator + distanceBetween(entryCorners[index], corner);
    }, 0);

    return Number((distances / 4).toFixed(4));
  });

  const minValueIndex = getMinValueIndex(distances);

  return entities[minValueIndex] ? entities[minValueIndex] : null;
}

/**
 * Returns the coordinates of the center of a given ClientRect
 */
function centerOfRectangle(hitbox: Hitbox): Coordinates {
  return {
    x: (hitbox[0] + hitbox[2]) / 2,
    y: (hitbox[1] + hitbox[2]) / 2,
  };
}


/**
 * Returns the closest rectangle from an array of rectangles to the center of a given
 * rectangle.
 */
export function closestCenter(entities: Entity[], target: Hitbox) {
  const centerRect = centerOfRectangle(target);
  const distances = entities.map((entity) =>
    distanceBetween(centerOfRectangle(entity.getHitbox()), centerRect)
  );

  const minValueIndex = getMinValueIndex(distances);

  return entities[minValueIndex] ? entities[minValueIndex] : null;
}

export function getBestIntersect(hits: Entity[], dragHitbox: Hitbox) {
  const centerRect = centerOfRectangle(dragHitbox);
  const distances = hits.map((entity) => {
    const center = centerOfRectangle(entity.getHitbox());
    const modifier = centerRect.y > center.y ? 10000 : 0;

    return distanceBetween(center, centerRect) + modifier;
  });

  const minValueIndex = getMinValueIndex(distances);

  return hits[minValueIndex] ? hits[minValueIndex] : null;
}
