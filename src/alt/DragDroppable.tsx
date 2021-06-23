import React from "react";
import classcat from "classcat";
import { motion, TargetAndTransition, Variants } from "framer-motion";
import { usePrevious } from "react-use";
import { areEqualWithPath } from "../components/helpers";
import {
  ActiveDragSetterContext,
  Dimensions,
  OverlayDimensionsContext,
} from "./Context";
import { isNextSibling } from "./helpers";
import { DragContext } from "./types";
import { useDrag, useDragLayer, useDrop, XYCoord } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";

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

export const Sortable = React.memo(function Sortable({
  className,
  orientation,
  id,
  type,
  path,
  children,
}: DragDropableProps & DragContext) {
  const dimensionsRef = React.useContext(OverlayDimensionsContext);
  const setActiveDrag = React.useContext(ActiveDragSetterContext);
  const [didReceiveDrop, setDidReceiveDrop] = React.useState(false);

  const ref = React.useRef<HTMLElement | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoedPath = React.useMemo(() => path, path);
  const ctx: DragContext = React.useMemo(
    () => ({
      id,
      type,
      path: memoedPath,
    }),
    [id, type, memoedPath]
  );

  const [{ isDragging, dr }, drag, preview] = useDrag(() => ({
    type,
    item: ctx,
    end: () => { console.log('drag end') },
    isDragging: (monitor) => {
      return monitor.getItem().id === id;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      dr: monitor.getDropResult(),
    }),
  }));

  if (dr) console.log(dr)

  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])

  const [{ isOver, active }, drop] = useDrop(() => ({
    accept: type,
    canDrop: (source: DragContext) => {
      return (
        source.type === type &&
        source.id !== id &&
        !isNextSibling(source.path, memoedPath)
      );
    },
    drop: (source) => {
      console.log("source:", source, "dest:", ctx);
      setDidReceiveDrop(true);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      active: monitor.getItem() as DragContext | null,
    }),
  }));

  React.useEffect(() => {
    if (didReceiveDrop) {
      setDidReceiveDrop(false);
    }
  }, [didReceiveDrop]);

  React.useEffect(() => {
    if (isDragging && ref.current) {
      dimensionsRef.current = {
        width: ref.current.clientWidth,
        height: ref.current.clientHeight,
      };
    }
  }, [isDragging, dimensionsRef]);

  React.useEffect(() => {
    if (isDragging) {
      setActiveDrag(ctx);
    }
  }, [isDragging, setActiveDrag, ctx]);

  const setRef = React.useCallback(
    (el: HTMLElement | null) => {
      drag(drop(el));
      ref.current = el;
    },
    [drag, drop]
  );

  const isActive =
    isOver &&
    !!active &&
    active.id !== id &&
    active.type === type &&
    !isNextSibling(active.path, memoedPath);

  return (
    <DragDroppableInterior
      className={useDragDroppableClass(
        orientation,
        isActive,
        false,
        isDragging,
        className
      )}
      didReceiveDrop={didReceiveDrop}
      isActive={isActive}
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
  children: React.ReactNode;
  className: string;
  didReceiveDrop?: boolean;
  isActive?: boolean;
  isOverlay?: boolean;
  orientation: Orientation;
  setRef?: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
}

export const DragDroppableInterior = React.memo(function DragDroppableInterior({
  children,
  className,
  didReceiveDrop,
  isActive,
  isOverlay,
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
    >
      {!isOverlay && (
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

function getDragOverlayStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  dimensionsRef: React.MutableRefObject<Dimensions | undefined>
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: "none",
    };
  }

  let { x, y } = currentOffset;

  const transform = `translate(${x}px, ${y}px)`;

  return {
    transform,
    width: dimensionsRef.current?.width || 0,
    height: dimensionsRef.current?.height || 0,
  };
}

interface DragLayerProps {
  children: React.ReactNode;
  className?: string;
}

export function DragOverlay({ className, children }: DragLayerProps) {
  const dimensionsRef = React.useContext(OverlayDimensionsContext);
  const { isDragging, initialOffset, currentOffset } = useDragLayer(
    (monitor) => ({
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
    })
  );

  if (!isDragging || !children) {
    return null;
  }

  return (
    <div className={classcat([className, "drag-layer"])}>
      <div
        style={getDragOverlayStyles(
          initialOffset,
          currentOffset,
          dimensionsRef
        )}
      >
        {children}
      </div>
    </div>
  );
}
