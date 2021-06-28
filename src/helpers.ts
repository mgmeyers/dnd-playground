import { ScrollMotionValues } from "framer-motion";
import { Entity, Hitbox, Orientation, ScrollShift } from "./types";

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
    hitbox[2] = hitbox[0] + Math.min(100, Math.round(rect.width * 0.2));
    return hitbox;
  }

  if (orientation === "horizontal" && side === "after") {
    hitbox[0] =
      hitbox[0] + rect.width - Math.min(100, Math.round(rect.width * 0.2));
    return hitbox;
  }

  if (orientation === "vertical" && side === "before") {
    hitbox[3] = hitbox[1] + Math.min(100, Math.round(rect.height * 0.2));
    return hitbox;
  }

  hitbox[1] =
    hitbox[1] + rect.height - Math.min(100, Math.round(rect.height * 0.2));

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

export function getPrimaryIntersection(entities: Entity[], target: Hitbox) {
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
  return entities.map((e) => [e, getIntersectionRatio(e.getHitbox(), target)]);
}
