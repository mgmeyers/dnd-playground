import React from "react";
import classcat from "classcat";
import {
  DraggableSyntheticListeners,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { areEqualWithIndexPath } from "../components/helpers";
import { OverlayDimensionsContext } from "./Context";
import { motion } from "framer-motion";

function isNextSibling(source: number[], sib: number[]): boolean {
  if (source.length !== sib.length) {
    return false;
  }

  return source.every((step, index) => {
    if (index === source.length - 1) {
      return step === sib[index] - 1;
    }

    return step === sib[index];
  });
}

function areSiblings(source: number[], sib: number[]): boolean {
  if (source.length !== sib.length) {
    return false;
  }

  return source.every((step, index) => {
    if (index === source.length - 1) {
      return step !== sib[index];
    }

    return step === sib[index];
  });
}

enum SiblingDirection {
  Before,
  After,
  NotSiblings,
}

function getSiblingDirection(
  source: number[],
  sib: number[]
): SiblingDirection {
  if (!areSiblings(source, sib)) {
    return SiblingDirection.NotSiblings;
  }

  const lastIndex = source.length - 1;

  if (source[lastIndex] < sib[lastIndex]) {
    return SiblingDirection.After;
  }

  return SiblingDirection.Before;
}

function useDragDroppableClass(
  orientation: Orientation,
  isOver: boolean,
  isOverlay: boolean,
  isDragging: boolean,
  className?: string
) {
  return classcat([
    className,
    "draggable-item",
    {
      "is-horizontal": orientation === "horizontal",
      "is-vertical": orientation === "vertical",
      "is-over": isOver,
      "is-overlay": isOverlay,
      "is-dragging": isDragging,
    },
  ]);
}

export interface DragDroppableContext {
  indexPath: number[];
  type: string;
  id: string;
}

type Orientation = "horizontal" | "vertical";

interface DragDropableProps {
  className?: string;
  orientation: Orientation;
  children: React.ReactNode;
}

export const DragDroppable = React.memo(function DragDroppable({
  className,
  orientation,
  id,
  type,
  indexPath,
  children,
}: DragDropableProps & DragDroppableContext) {
  const params = {
    id,
    data: {
      id,
      type,
      indexPath,
    },
  };

  const { isOver, active, setNodeRef: setDroppable } = useDroppable(params);

  const {
    isDragging,
    setNodeRef: setDraggable,
    listeners,
    attributes,
  } = useDraggable(params);

  const setRef = React.useCallback(
    (el: HTMLElement | null) => {
      setDroppable(el);
      setDraggable(el);
    },
    [setDroppable, setDraggable]
  );

  const sortDirection = getSiblingDirection(
    active?.data.current?.indexPath || [],
    indexPath
  );

  const isActive =
    isOver && active?.id !== id && active?.data.current?.type === type;

  return (
    <DragDroppableInterior
      attributes={attributes}
      className={useDragDroppableClass(
        orientation,
        isActive,
        false,
        isDragging,
        className
      )}
      isActive={isActive}
      listeners={listeners}
      orientation={orientation}
      setRef={setRef}
      sortDirection={sortDirection}
    >
      {children}
    </DragDroppableInterior>
  );
},
areEqualWithIndexPath);

export const DragDroppableOverlay = React.memo(function DragDroppableOverlay({
  orientation,
  className,
  children,
}: React.PropsWithChildren<DragDropableProps>) {
  return (
    <DragDroppableInterior
      className={useDragDroppableClass(
        orientation,
        false,
        true,
        false,
        className
      )}
      orientation={orientation}
    >
      {children}
    </DragDroppableInterior>
  );
});

interface DragDroppableInteriorProps {
  attributes?: { [k: string]: number | string | boolean | undefined };
  className: string;
  isActive?: boolean;
  listeners?: DraggableSyntheticListeners;
  orientation: Orientation;
  setRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
  sortDirection?: SiblingDirection;
}

export const DragDroppableInterior = React.memo(function DragDroppableInterior({
  attributes,
  className,
  children,
  isActive,
  listeners,
  orientation,
  setRef,
  sortDirection,
}: DragDroppableInteriorProps) {
  return (
    <div ref={setRef} {...listeners} {...attributes}>
      {!!listeners && (
        <Placeholder
          orientation={orientation}
          sortDirection={sortDirection}
          isOver={!!isActive}
        />
      )}
      <div className={className}>{children}</div>
    </div>
  );
});

const transition = {
  delay: 0.15,
  type: "tween",
  duration: 0.2,
};

const Placeholder = React.memo(
  ({
    orientation,
    isOver,
    sortDirection,
  }: {
    orientation: Orientation;
    isOver: boolean;
    sortDirection?: SiblingDirection;
  }) => {
    const dimensionsRef = React.useContext(OverlayDimensionsContext);

    const animationDimension = orientation === "vertical" ? "height" : "width";
    const staticDimension = orientation === "vertical" ? "width" : "height";

    let style = {
      [staticDimension]: 0,
    };

    let animate = {
      [animationDimension]: 0,
    };

    if (isOver && dimensionsRef.current) {
      style = {
        [staticDimension]: dimensionsRef.current[staticDimension],
      };

      animate = {
        [animationDimension]: dimensionsRef.current[animationDimension],
      };
    }

    return (
      <motion.div
        style={style}
        animate={animate}
        transition={transition}
        className={classcat([
          "drop-placeholder",
          {
            "is-before":
              sortDirection === SiblingDirection.Before ||
              sortDirection === SiblingDirection.NotSiblings,
            "is-after": sortDirection === SiblingDirection.After,
            "is-over": isOver,
            "is-horizontal": orientation === "horizontal",
            "is-vertical": orientation === "vertical",
          },
        ])}
      />
    );
  }
);

export function DragDroppableList({
  className,
  orientation,
  children,
}: React.PropsWithChildren<{ className?: string; orientation: Orientation }>) {
  return (
    <div className={className}>
      <div
        className={classcat({
          "sortable-list-horizontal": orientation === "horizontal",
          "sortable-list-vertical": orientation === "vertical",
        })}
      >
        {children}
      </div>
    </div>
  );
}
