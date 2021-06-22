export type EntityPath = number[];

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

export type Item = Nestable<ItemData>
export type Lane = Nestable<LaneData, Item>

export interface DragContext extends NestableProps {
  path: EntityPath;
}