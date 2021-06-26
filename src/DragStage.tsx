import React from "react";
import classcat from "classcat";
import { motion, Transition } from "framer-motion";
import { TEST_BOARD } from "./data";
import { Coordinates, Entity, Hitbox, Orientation } from "./types";
import rafSchd from "raf-schd";
import boxIntersect from "box-intersect";

import {
  RootContext,
  ScrollContext,
  HitboxContext,
  HitboxManagerContext,
  DragManagerContext,
} from "./context";
import { DebugIntersections } from "./Debug";

export function DragStage() {
  return (
    <RootContext>
      <div className="app">
        <div className="app-header">Lorem Ipsum</div>
        <div className="app-body">
          <ScrollContainer className="board" orientation="horizontal">
            {TEST_BOARD.map((lane, i) => {
              return (
                <HitboxComponent
                  className="lane"
                  data={lane}
                  id={lane.id}
                  index={i}
                  key={lane.id}
                >
                  <div className="lane-title">
                    {lane.id}: {lane.data.title}
                  </div>
                  <ScrollContainer
                    className="lane-items"
                    orientation="vertical"
                  >
                    {lane.children.map((item, i) => {
                      return (
                        <HitboxComponent
                          className="item"
                          data={item}
                          id={item.id}
                          index={i}
                          key={item.id}
                        >
                          {item.id}: {item.data.title}
                        </HitboxComponent>
                      );
                    })}
                  </ScrollContainer>
                </HitboxComponent>
              );
            })}
          </ScrollContainer>
        </div>
      </div>
      <DragOverlay>
        {(entity, style, intersections) => (
          <>
            <div style={style} className="hitbox">
              DRAG
            </div>
            <DebugIntersections hitboxes={intersections} />
          </>
        )}
      </DragOverlay>
    </RootContext>
  );
}

interface DragOverlayProps {
  children(
    entity: Entity,
    style: React.CSSProperties,
    intersections: Entity[]
  ): JSX.Element;
}

function adjustForMovement(
  hitbox: Hitbox,
  origin: Coordinates,
  position: Coordinates
) {
  const xShift = position.x - origin.x;
  const yShift = position.y - origin.y;

  return [
    hitbox[0] + xShift,
    hitbox[1] + yShift,
    hitbox[2] + xShift,
    hitbox[3] + yShift,
  ];
}

export function DragOverlay({ children }: DragOverlayProps) {
  const dragManager = React.useContext(DragManagerContext);
  const hitboxManager = React.useContext(HitboxManagerContext);
  const [id, setId] = React.useState<string>();
  const [origin, setOrigin] = React.useState<Coordinates>();
  const [position, setPosition] = React.useState<Coordinates>();
  const [intersections, setIntersections] = React.useState<Entity[]>([]);

  React.useEffect(() => {
    const handler = (
      id: string,
      origin: Coordinates,
      position: Coordinates
    ) => {
      setId(id);
      setOrigin(origin);
      setPosition(position);

      const entity = hitboxManager.getEntity(id);

      if (entity) {
        const entityArr = Array.from(
          hitboxManager.hitboxes.current?.values() || []
        );
        const boxes = Array.from(entityArr).map((e) => e.getHitbox());
        const intersections = boxIntersect(
          [adjustForMovement(entity.getHitbox(), origin, position)],
          boxes
        );

        setIntersections(intersections.map((i) => entityArr[i[1]]));
      }
    };

    const endHandler = () => {
      setId(undefined);
      setOrigin(undefined);
      setPosition(undefined);
    };

    dragManager.registerListeners(handler, handler, endHandler);

    return () => {
      dragManager.unregisterListeners(handler, handler, endHandler);
    };
  }, [dragManager, hitboxManager]);

  if (!id || !position || !origin) {
    return null;
  }

  const entity = hitboxManager.getEntity(id);

  if (!entity) return null;

  const hitbox = entity.getHitbox();

  const style: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    transform: `translate3d(${position.x - origin.x + hitbox[0]}px, ${
      position.y - origin.y + hitbox[1]
    }px, 0px)`,
    width: `${hitbox[2] - hitbox[0]}px`,
    height: `${hitbox[3] - hitbox[1]}px`,
  };

  return children(entity, style, intersections);
}

interface ScrollContainerProps {
  children?: React.ReactNode;
  className?: string;
  orientation: Orientation;
}

export function ScrollContainer({
  className,
  children,
  orientation,
}: ScrollContainerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <ScrollContext scrollRef={scrollRef}>
      <div
        ref={scrollRef}
        className={classcat([className, "scroll-container", orientation])}
      >
        {children}
      </div>
    </ScrollContext>
  );
}

const transition: Transition = {
  type: "spring",
  duration: 0.3,
  bounce: 0,
};

interface HitboxProps {
  children?: React.ReactNode;
  className?: string;
  data?: Record<string, any>;
  id: string;
  index: number;
}

export function HitboxComponent({
  id,
  className,
  children,
  index,
  data,
}: HitboxProps) {
  const hitboxRef = React.useRef<HTMLDivElement>(null);
  const dragManager = React.useContext(DragManagerContext);

  const onPointerDown: React.PointerEventHandler = React.useCallback(
    (e) => {
      dragManager.emitDragStart(e.nativeEvent, id);
      e.stopPropagation();
      e.preventDefault();

      const onMove = rafSchd((e: PointerEvent) => {
        dragManager.emitDragMove(e);
      });

      const onEnd = (e: PointerEvent) => {
        dragManager.emitDragEnd(e);

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [dragManager, id]
  );

  return (
    <HitboxContext data={data} hitboxRef={hitboxRef} id={id} index={index}>
      <motion.div
        ref={hitboxRef}
        transition={transition}
        className={classcat([className, "box"])}
        onPointerDown={onPointerDown}
      >
        {children}
      </motion.div>
    </HitboxContext>
  );
}
