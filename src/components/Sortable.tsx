import { CSS } from "@dnd-kit/utilities";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import classcat from "classcat";
import {
  DraggableItemContext,
  DraggableListContext,
  SortableDirection,
  WithId,
} from "./types";
import { areEqualWithCtx, getStrategy } from "./helpers";

function useListClasses({
  direction,
  isDroppable,
  className,
  isDropzoneHovered,
}: {
  direction: SortableDirection;
  isDroppable: boolean;
  className?: string;
  isDropzoneHovered?: boolean;
}) {
  return classcat([
    className,
    {
      "is-droppable": isDroppable,
      "is-active-dropzone": isDropzoneHovered,
      "sortable-list-horizontal": direction === SortableDirection.Horizontal,
      "sortable-list-vertical": direction === SortableDirection.Vertical,
    },
  ]);
}

function useItemClasses({
  isDragging,
  isOverlay,
  className,
}: {
  isDragging: boolean;
  isOverlay: boolean;
  className?: string;
}) {
  return classcat([
    className,
    {
      "is-dragging": isDragging,
      "is-overlay": isOverlay,
    },
  ]);
}

export interface SortableListProps<T> {
  direction: SortableDirection;
  accepts: string;
  list: Array<T>;
  id: string;
  ctx: DraggableListContext;
  className?: string;
}

export const SortableList = React.memo(function SortableList<
  ListType extends WithId
>({
  id,
  list,
  direction,
  children,
  className,
}: React.PropsWithChildren<SortableListProps<ListType>>) {
  return (
    <SortableContext
      id={`sortable-${id}`}
      items={list}
      strategy={getStrategy(direction)}
    >
      <div
        className={useListClasses({
          direction,
          isDroppable: false,
          className,
        })}
      >
        {children}
      </div>
    </SortableContext>
  );
},
areEqualWithCtx);

export const SortableDroppableList = React.memo(function SortableDroppableList<
  ListType extends WithId
>({
  id,
  accepts,
  list,
  direction,
  children,
  className,
  ctx,
}: React.PropsWithChildren<SortableListProps<ListType>>) {
  const sortableId = `sortable-${id}`;
  const { active, over, isOver, setNodeRef } = useDroppable({
    id: `droppable-${id}`,
    data: ctx,
  });

  const isDropzoneHovered =
    active?.data.current?.type === accepts &&
    (isOver || over?.data.current?.sortable?.containerId === sortableId);

  return (
    <SortableContext
      id={sortableId}
      items={list}
      strategy={getStrategy(direction)}
    >
      <div
        ref={setNodeRef}
        className={useListClasses({
          direction,
          isDroppable: true,
          className,
          isDropzoneHovered,
        })}
      >
        {children}
      </div>
    </SortableContext>
  );
},
areEqualWithCtx);

export const SortableListOverlay = React.memo(function SortableListOverlay<
  ListType extends WithId
>({
  direction,
  children,
  className,
}: React.PropsWithChildren<SortableListProps<ListType>>) {
  return (
    <div
      className={useListClasses({ direction, isDroppable: false, className })}
    >
      {children}
    </div>
  );
},
areEqualWithCtx);

interface SortableItemProps<T> {
  id: string;
  className?: string;
  ctx: DraggableItemContext<T>;
}

export const SortableItem = React.memo(function SortableItem<T>({
  id,
  className,
  children,
  ctx,
}: React.PropsWithChildren<SortableItemProps<T>>) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    data: ctx,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || undefined,
    // touchAction: "none",
  };

  return (
    <div
      style={style}
      ref={setNodeRef}
      className={useItemClasses({ isDragging, isOverlay: false, className })}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
},
areEqualWithCtx);

export const SortableItemOverlay = React.memo(function SortableItemOverlay<T>({
  className,
  children,
}: React.PropsWithChildren<SortableItemProps<T>>) {
  return (
    <div
      className={useItemClasses({
        isDragging: false,
        isOverlay: true,
        className,
      })}
    >
      {children}
    </div>
  );
});
