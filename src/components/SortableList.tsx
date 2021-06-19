import { SortableContext } from "@dnd-kit/sortable";
import React from "react";
import { useDroppable } from "@dnd-kit/core";
import classcat from "classcat";
import {
  DragContext,
  Nestable,
  SortableDirection,
  NestableProps,
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

export interface SortableListProps<ListType, ChildType> {
  direction: SortableDirection;
  accepts: string;
  content: Nestable<ListType, ChildType>;
  ctx: DragContext<ListType>;
  className?: string;
}

export const SortableList = React.memo(function SortableList<
  ListType,
  ChildType extends NestableProps
>({
  direction,
  children,
  content,
  className,
}: React.PropsWithChildren<SortableListProps<ListType, ChildType>>) {
  return (
    <SortableContext
      id={`sortable-${content.id}`}
      items={content.children}
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
  ListType,
  ChildType extends NestableProps
>({
  accepts,
  direction,
  content,
  children,
  className,
  ctx,
}: React.PropsWithChildren<SortableListProps<ListType, ChildType>>) {
  const sortableId = `sortable-${content.id}`;
  const { active, over, isOver, setNodeRef } = useDroppable({
    id: `droppable-${content.id}`,
    data: ctx,
  });

  const isDropzoneHovered =
    active?.data.current?.data.type === accepts &&
    (isOver || over?.data.current?.sortable?.containerId === sortableId);

  return (
    <SortableContext
      id={sortableId}
      items={content.children}
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
  ListType,
  ChildType extends NestableProps
>({
  direction,
  children,
  className,
}: React.PropsWithChildren<SortableListProps<ListType, ChildType>>) {
  return (
    <div
      className={useListClasses({ direction, isDroppable: false, className })}
    >
      {children}
    </div>
  );
},
areEqualWithCtx);
