import React from "react";
import classcat from "classcat";
import {
  DraggableSyntheticListeners,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { motion, TargetAndTransition, Variants } from "framer-motion";
import { usePrevious } from "react-use";
import { areEqualWithPath } from "../components/helpers";
import { OverlayDimensionsContext } from "./Context";
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
  if (isOverlay) {
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
},
areEqualWithPath);

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

  const {
    isDragging,
    setNodeRef: setDraggable,
    listeners,
    attributes,
  } = useDraggable(params);

  const { isOver, active, setNodeRef: setDroppable } = useDroppable(params);

  const prevIsOver = usePrevious(isOver);
  const prevActive = usePrevious(active);

  const didReceiveDrop = !!prevIsOver && !isOver && !!prevActive && !active;

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
      didReceiveDrop={didReceiveDrop}
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
      isOverlay
    >
      {children}
    </DragDroppableInterior>
  );
});

interface DragDroppableInteriorProps {
  attributes?: { [k: string]: number | string | boolean | undefined };
  children: React.ReactNode;
  className: string;
  didReceiveDrop?: boolean;
  isActive?: boolean;
  isOverlay?: boolean;
  listeners?: DraggableSyntheticListeners;
  orientation: Orientation;
  setRef?: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
}

export const DragDroppableInterior = React.memo(function DragDroppableInterior({
  attributes,
  children,
  className,
  didReceiveDrop,
  isActive,
  isOverlay,
  listeners,
  orientation,
  setRef,
  style,
}: DragDroppableInteriorProps) {
  const dimensionsRef = React.useContext(OverlayDimensionsContext);

  const staticDimension = orientation === "vertical" ? "width" : "height";
  const exitDimension = orientation === "vertical" ? "height" : "width";
  const exit = React.useMemo<TargetAndTransition>(
    () => ({ [exitDimension]: 0, visibility: "hidden" }),
    [exitDimension]
  );

  const combinedStyles = React.useMemo(() => {
    if (isOverlay && dimensionsRef.current) {
      return {
        ...style,
        [staticDimension]: dimensionsRef.current[staticDimension],
      };
    }

    return style;
  }, [style, isOverlay, staticDimension, dimensionsRef]);

  const wrapperClassName = React.useMemo(
    () =>
      classcat([
        "draggable-item",
        {
          "is-overlay": isOverlay,
        },
      ]),
    [isOverlay]
  );

  return (
    <motion.div
      style={combinedStyles}
      exit={exit}
      transition={transition}
      className={wrapperClassName}
      ref={setRef}
      {...listeners}
      {...attributes}
    >
      {!!listeners && (
        <Placeholder
          orientation={orientation}
          isOver={!!isActive}
          shouldSuppressAnimation={!!didReceiveDrop}
        />
      )}
      <div className={className}>{children}</div>
    </motion.div>
  );
});

const Placeholder = React.memo(
  ({
    orientation,
    isOver,
    shouldSuppressAnimation,
  }: {
    orientation: Orientation;
    isOver: boolean;
    shouldSuppressAnimation: boolean;
  }) => {
    const dimensionsRef = React.useContext(OverlayDimensionsContext);

    const animationDimension = orientation === "vertical" ? "height" : "width";
    const size = dimensionsRef.current
      ? dimensionsRef.current[animationDimension]
      : 0;

    const variants: Variants = React.useMemo(
      () => ({
        open: {
          [animationDimension]: size,
          transition,
        },
        openImmediately: {
          [animationDimension]: size,
          transition: noTransition,
        },
        close: {
          [animationDimension]: 0,
          transition,
        },
        closeImmediately: {
          [animationDimension]: 0,
          transition: noTransition,
        },
      }),
      [animationDimension, size]
    );

    let animate = shouldSuppressAnimation ? "closeImmediately" : "close";

    if (isOver) {
      animate = shouldSuppressAnimation ? "openImmediately" : "open";
    }

    return (
      <motion.div
        initial="closeImmediately"
        animate={animate}
        variants={variants}
        transition={transition}
        className={classcat([
          "drop-placeholder",
          {
            "is-over": isOver,
            "is-horizontal": orientation === "horizontal",
            "is-vertical": orientation === "vertical",
          },
        ])}
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
        {children}
      </div>
    </div>
  );
}
