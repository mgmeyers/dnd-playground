import { Coordinates } from "./types";

export const curves = {
  outOfTheWay: "cubic-bezier(0.2, 0, 0, 1)",
  drop: "cubic-bezier(.2,1,.1,1)",
};

export const combine = {
  opacity: {
    // while dropping: fade out totally
    drop: 0,
    // while dragging: fade out partially
    combining: 0.7,
  },
  scale: {
    drop: 0.75,
  },
};

export const timings = {
  outOfTheWay: 0.2,
  minDropTime: 0.33,
  maxDropTime: 0.55,
};

const outOfTheWayTiming: string = `${timings.outOfTheWay}s ${curves.outOfTheWay}`;
export const placeholderTransitionDelayTime: number = 0.1;

export const transitions = {
  fluid: `opacity ${outOfTheWayTiming}`,
  snap: `transform ${outOfTheWayTiming}, opacity ${outOfTheWayTiming}`,
  drop: (duration: number): string => {
    const timing: string = `${duration}s ${curves.drop}`;
    return `transform ${timing}, opacity ${timing}`;
  },
  outOfTheWay: `transform ${outOfTheWayTiming}`,
  placeholder: `height ${outOfTheWayTiming}, width ${outOfTheWayTiming}, margin ${outOfTheWayTiming}`,
};

export const isEqual = (point1: Coordinates, point2: Coordinates): boolean =>
  point1.x === point2.x && point1.y === point2.y;

export const origin: Coordinates = { x: 0, y: 0 };

const moveTo = (offset: Coordinates): string | null =>
  isEqual(offset, origin) ? null : `translate(${offset.x}px, ${offset.y}px)`;

export const transforms = {
  moveTo,
  drop: (offset: Coordinates, isCombining: boolean) => {
    const translate: string | null = moveTo(offset);
    if (!translate) {
      return null;
    }

    // only transforming the translate
    if (!isCombining) {
      return translate;
    }

    // when dropping while combining we also update the scale
    return `${translate} scale(${combine.scale.drop})`;
  },
};
