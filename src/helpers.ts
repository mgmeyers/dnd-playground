import { ScrollMotionValues } from "framer-motion";
import { Hitbox, ScrollShift } from "./types";

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
