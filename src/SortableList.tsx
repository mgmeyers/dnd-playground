import { CSS } from "@dnd-kit/utilities";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import React from "react";

export interface DraggableItemContext<T> {
  type: string;
  containingListId: string;
  indexPath: number[];
  data: T;
}

export enum SortableDirection {
  Vertical,
  Horizontal,
}

export function getStrategy(direction: SortableDirection) {
  switch (direction) {
    case SortableDirection.Horizontal:
      return horizontalListSortingStrategy;
    case SortableDirection.Vertical:
      return verticalListSortingStrategy;
  }
}

export interface WithId {
  id: string;
}

export interface SortableListProps<T> {
  direction: SortableDirection;
  accepts: string;
  list: Array<T>;
  id: string;
  className?: string;
}

export function SortableList<ListType extends WithId>({
  id,
  list,
  direction,
  children,
  className,
}: React.PropsWithChildren<SortableListProps<ListType>>) {
  const classList: string[] = [];

  if (className) {
    classList.push(className);
  }
  if (direction === SortableDirection.Horizontal) {
    classList.push("sortable-list-horizontal");
  } else {
    classList.push("sortable-list-vertical");
  }

  const cls = classList.length ? classList.join(" ") : undefined;

  return (
    <div className={cls}>
      <SortableContext
        id={`sortable-${id}`}
        items={list}
        strategy={getStrategy(direction)}
      >
        {children}
      </SortableContext>
    </div>
  );
}

export function SortableListOverlay<ListType extends WithId>({
  id,
  list,
  direction,
  children,
  className,
}: React.PropsWithChildren<SortableListProps<ListType>>) {
  const classList: string[] = [];

  if (className) {
    classList.push(className);
  }
  if (direction === SortableDirection.Horizontal) {
    classList.push("sortable-list-horizontal");
  } else {
    classList.push("sortable-list-vertical");
  }

  const cls = classList.length ? classList.join(" ") : undefined;

  return <div className={cls}>{children}</div>;
}

interface SortableItemProps<T> {
  id: string;
  className?: string;
  data: DraggableItemContext<T>;
}

export function SortableItem<T>({
  id,
  className,
  children,
  data,
}: React.PropsWithChildren<SortableItemProps<T>>) {
  const classList: string[] = [];
  const {
    attributes,
    isDragging,
    isSorting,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    data,
  });

  if (className) {
    classList.push(className);
  }

  if (isDragging) {
    classList.push("is-dragging");
  }

  if (isSorting) {
    classList.push("is-sorting");
  }

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || undefined,
    // touchAction: "none",
  };

  const cls = classList.length ? classList.join(" ") : undefined;

  return (
    <div
      style={style}
      ref={setNodeRef}
      className={cls}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

export function SortableItemOverlay<T>({
  className,
  children,
  data,
}: React.PropsWithChildren<SortableItemProps<T>>) {
  const classList: string[] = [];

  if (className) {
    classList.push(className);
  }

  classList.push("is-overlay");

  const cls = classList.length ? classList.join(" ") : undefined;

  return <div className={cls}>{children}</div>;
}
