import React from "react";
import classcat from "classcat";
import {
  DraggableSyntheticListeners,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { areEqualWithPath } from "../components/helpers";
import { OverlayDimensionsContext } from "./Context";
import {
  AnimatePresence,
  motion,
  TargetAndTransition,
  useIsPresent,
} from "framer-motion";
import { isNextSibling } from "./helpers";
import { DragContext } from "./types";

const transition = {
  type: "tween",
  duration: 0.2,
  ease: [0.2, 0, 0, 1],
};

const noTransition = {
  ...transition,
  duration: 0,
};

function useDragDroppableClass(
  orientation: Orientation,
  isOver: boolean,
  isOverlay: boolean,
  isDragging: boolean,
  className?: string
) {
  return classcat([
    className,
    {
      "is-horizontal": orientation === "horizontal",
      "is-vertical": orientation === "vertical",
      "is-over": isOver,
      "is-overlay": isOverlay,
      "is-dragging": isDragging,
    },
  ]);
}

type Orientation = "horizontal" | "vertical";

interface DragDropableProps {
  className?: string;
  style?: React.CSSProperties;
  orientation: Orientation;
  children: React.ReactNode;
}

interface SwitchProps {
  isOverlay?: boolean;
}

export const Sortable = React.memo(function Sortable({
  className,
  orientation,
  id,
  type,
  path,
  children,
  isOverlay,
}: DragDropableProps & DragContext & SwitchProps) {
  const isPresent = useIsPresent();

  if (!isPresent || isOverlay) {
    return (
      <DraggableOverlay className={className} orientation={orientation}>
        {children}
      </DraggableOverlay>
    );
  }

  return (
    <DragDroppable
      className={className}
      orientation={orientation}
      path={path}
      type={type}
      id={id}
    >
      {children}
    </DragDroppable>
  );
});

export const DragDroppable = React.memo(function DragDroppable({
  className,
  orientation,
  id,
  type,
  path,
  children,
}: DragDropableProps & DragContext) {
  const params = {
    id,
    data: {
      id,
      type,
      path,
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

  const isActive =
    isOver &&
    active?.id !== id &&
    active?.data.current?.type === type &&
    !isNextSibling(active.data.current.path, path);

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
    >
      {children}
    </DragDroppableInterior>
  );
},
areEqualWithPath);

export const DraggableOverlay = React.memo(function DraggableOverlay({
  orientation,
  className,
  children,
  style,
}: React.PropsWithChildren<DragDropableProps>) {
  return (
    <DragDroppableInterior
      style={style}
      className={useDragDroppableClass(
        orientation,
        false,
        true,
        false,
        className
      )}
      orientation={orientation}
      isOverlay={true}
    >
      {children}
    </DragDroppableInterior>
  );
});

interface DragDroppableInteriorProps {
  attributes?: { [k: string]: number | string | boolean | undefined };
  className: string;
  style?: React.CSSProperties;
  isActive?: boolean;
  isOverlay?: boolean;
  listeners?: DraggableSyntheticListeners;
  orientation: Orientation;
  setRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}

export const DragDroppableInterior = React.memo(function DragDroppableInterior({
  attributes,
  className,
  style,
  children,
  isActive,
  isOverlay,
  listeners,
  orientation,
  setRef,
}: DragDroppableInteriorProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  const exitDimension = orientation === "vertical" ? "height" : "width";
  const exit = React.useMemo<TargetAndTransition>(
    () => ({ [exitDimension]: 0, visibility: "hidden" }),
    [exitDimension]
  );

  return (
    <motion.div
      style={style}
      exit={exit}
      transition={transition}
      className={classcat([
        "draggable-item",
        {
          "is-overlay": isOverlay,
        },
      ])}
      ref={(c) => {
        if (setRef) {
          setRef(c);
        }

        ref.current = c;
      }}
      {...listeners}
      {...attributes}
    >
      {!!listeners && (
        <Placeholder orientation={orientation} isOver={!!isActive} />
      )}
      <div className={className}>{children}</div>
    </motion.div>
  );
});

const Placeholder = React.memo(
  ({ orientation, isOver }: { orientation: Orientation; isOver: boolean }) => {
    const dimensionsRef = React.useContext(OverlayDimensionsContext);

    const { style, animate, className } = React.useMemo(() => {
      const animationDimension =
        orientation === "vertical" ? "height" : "width";
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

      return {
        style,
        animate,
        className: classcat([
          "drop-placeholder",
          {
            "is-over": isOver,
            "is-horizontal": orientation === "horizontal",
            "is-vertical": orientation === "vertical",
          },
        ]),
      };
    }, [orientation, isOver, dimensionsRef]);

    return (
      <motion.div
        style={style}
        animate={animate}
        transition={transition}
        className={className}
      />
    );
  }
);

export function SortableList({
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
        <AnimatePresence>{children}</AnimatePresence>
      </div>
    </div>
  );
}
