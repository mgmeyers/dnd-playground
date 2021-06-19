export enum SortableDirection {
  Vertical,
  Horizontal,
}

export interface NestableProps {
  id: string;
  type: string;
}

export interface Nestable<D, T = never> extends NestableProps {
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

export interface DragContext<T> {
  parentId: string | null;
  indexPath: number[];
  data: T;
}