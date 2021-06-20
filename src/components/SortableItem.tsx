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
    rect,
  } = useSortable({
    id: ctx.data.id,
    data: ctx,
  });

  const dragRect = rect.current;
  const isTypeSorting =
    transform && active?.data.current?.data.type === ctx.data.type;
  const shouldDisplayDragPlaceholder = isDragging && dragRect;

  const style = React.useMemo(() => {
    let styles: React.CSSProperties | undefined = undefined;

    if (isTypeSorting) {
      styles = {
        transform: CSS.Translate.toString(transform),
        transition: transition || undefined,
      };
    }

    if (shouldDisplayDragPlaceholder) {
      styles = {
        ...(styles || {}),
        width: dragRect?.width,
        height: dragRect?.height,
      };
    }

    return styles;
  }, [
    isTypeSorting,
    transform,
    transition,
    shouldDisplayDragPlaceholder,
    dragRect,
  ]);

  return (
    <div
      style={style}
      ref={setNodeRef}
      className={useItemClasses({ isDragging, isOverlay: false, className })}
      {...listeners}
      {...attributes}
    >
      {shouldDisplayDragPlaceholder ? null : children}
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
