import { ScrollMotionValues } from "framer-motion";

export type Orientation = "horizontal" | "vertical";

export interface NestableProps {
  id: string;
  type: string;
  accepts: string[];
}

export interface Nestable<D = any, T = any> extends NestableProps {
  children: T[];
  data: D;
}

export interface ItemData {
  title: string;
}

export interface LaneData {
  title: string;
}

export type Item = Nestable<ItemData>;
export type Lane = Nestable<LaneData, Item>;

//Interpretation: [minX, minY, maxX, maxY]
export type Hitbox = [number, number, number, number];
export interface ScrollShift {
  x: number;
  y: number;
}
export interface Coordinates {
  x: number;
  y: number;
}
export type Path = number[];

export interface EntityData {
  type: string;
  id: string;
  accepts: string[];
  [k: string]: any;
}

export interface Entity {
  getPath(): Path;
  getHitbox(): Hitbox;
  getData(): EntityData;
  getOrientation(): Orientation;
  recalcInitial(): void;

  scopeId: string;
  initial: Hitbox;
  pathRef: React.MutableRefObject<{ path: Path }>;
  scrollRef: React.MutableRefObject<ScrollMotionValues | null>;
  scrollShiftRef: React.RefObject<ScrollShift>;
}

export interface WithChildren {
  children: React.ReactNode;
}
