import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import React from "react";
import classcat from "classcat";
import { DragContext, NestableProps } from "./types";
import { areEqualWithCtx } from "./helpers";

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
    "draggable-item",
    {
      "is-dragging": isDragging,
      "is-overlay": isOverlay,
    },
  ]);
}

interface SortableItemProps<T> {
  className?: string;
  ctx: DragContext<T>;
}

export const SortableItem = React.memo(function SortableItem<
  T extends NestableProps
>({ className, children, ctx }: React.PropsWithChildren<SortableItemProps<T>>) {
  const {
    active,
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: ctx.data.id,
    data: ctx,
  });

  const isTypeSorting = active?.data.current?.data.type === ctx.data.type;
  const style = React.useMemo(
    () =>
      isTypeSorting
        ? {
            transform: CSS.Translate.toString(transform),
            transition: transition || undefined,
          }
        : undefined,
    [isTypeSorting, transform, transition]
  );

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
