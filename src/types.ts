import { ScrollMotionValues } from "framer-motion";

export type Orientation = "horizontal" | "vertical";

export interface NestableProps {
  id: string;
  type: string;
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
export interface EntityPath {
  path: number[];
}

export interface Entity {
  getHitbox(): Hitbox;
  getData(): Record<string, any>;
  recalcInitial(): void;

  initial: Hitbox;
  pathRef: React.MutableRefObject<EntityPath>;
  scrollRef: React.MutableRefObject<ScrollMotionValues | null>;
  scrollShiftRef: React.RefObject<ScrollShift>;
}

export interface WithChildren {
  children: React.ReactNode;
}
