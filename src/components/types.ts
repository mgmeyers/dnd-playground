export enum SortableDirection {
  Vertical,
  Horizontal,
}

export interface DraggableItemContext<T> {
  type: string;
  containingListId: string;
  indexPath: number[];
  data: T;
}

export interface WithId {
  id: string;
}

export interface Item {
  id: string;
  title: string;
}

export interface Lane {
  id: string;
  title: string;
  items: Item[];
}
