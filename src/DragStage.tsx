import React from "react";
import classcat from "classcat";
import { motion, Transition } from "framer-motion";
import { TEST_BOARD } from "./data";
import { Coordinates, Entity, EntityData, Hitbox, Orientation } from "./types";
import rafSchd from "raf-schd";
import boxIntersect from "box-intersect";

import {
  RootContext,
  ScrollContext,
  HitboxContext,
  HitboxManagerContext,
  EventContext,
} from "./context";
import { DebugIntersections } from "./Debug";
import { Unsubscribe } from "nanoevents";
import { getPrimaryIntersection, getScrollIntersection } from "./helpers";

export function DragStage() {
  return (
    <RootContext>
      <div className="app">
        <div className="app-header">Lorem Ipsum</div>
        <div className="app-body">
          <ScrollContainer
            className="board"
            orientation="horizontal"
            triggerTypes={["lane", "item"]}
          >
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
                    triggerTypes={["item"]}
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
): Hitbox {
  const xShift = position.x - origin.x;
  const yShift = position.y - origin.y;

  return [
    hitbox[0] + xShift,
    hitbox[1] + yShift,
    hitbox[2] + xShift,
    hitbox[3] + yShift,
  ];
}

function getScrollIntersectionDiff(
  prev: [Entity, number][],
  next: [Entity, number][]
): {
  add: [Entity, number][];
  update: [Entity, number][];
  remove: [Entity, number][];
} {
  const add: [Entity, number][] = [];
  const remove: [Entity, number][] = [];
  const update: [Entity, number][] = [];

  const inPrev: Record<string, [Entity, number]> = {};
  const inNext: Record<string, [Entity, number]> = {};

  prev.forEach((intersection) => {
    inPrev[intersection[0].getData().id] = intersection;
  });

  next.forEach((intersection) => {
    const id = intersection[0].getData().id;

    if (!inPrev[id]) {
      add.push(intersection);
    } else if (inPrev[id][1] !== intersection[1]) {
      update.push(intersection);
    }

    inNext[id] = intersection;
  });

  prev.forEach((intersection) => {
    if (!inNext[intersection[0].getData().id]) {
      remove.push(intersection);
    }
  });

  return {
    add,
    update,
    remove,
  };
}

export function DragOverlay({ children }: DragOverlayProps) {
  const eventContext = React.useContext(EventContext);
  const hitboxManager = React.useContext(HitboxManagerContext);

  const [id, setId] = React.useState<string>();
  const [origin, setOrigin] = React.useState<Coordinates>();
  const [position, setPosition] = React.useState<Coordinates>();

  const primaryIntersectionRef = React.useRef<Entity | null>(null);
  const scrollIntersectionRef = React.useRef<[Entity, number][]>([]);
  const activeHitboxRef = React.useRef<Hitbox | null>(null);
  const activeEntityRef = React.useRef<Entity | null>(null);

  const intersections: Entity[] = [];

  if (primaryIntersectionRef.current) {
    intersections.push(primaryIntersectionRef.current);
  }

  if (scrollIntersectionRef.current.length) {
    intersections.push(...scrollIntersectionRef.current.map(([e]) => e));
  }

  React.useEffect(() => {
    const handler = (
      id: string,
      origin: Coordinates,
      position: Coordinates
    ) => {
      setId(id);
      setOrigin(origin);
      setPosition(position);

      const entity = hitboxManager.getEntity(id) || activeEntityRef.current;
      const hitboxes = hitboxManager.hitboxes.current;

      if (entity && hitboxes) {
        if (!activeHitboxRef.current) {
          activeEntityRef.current = entity;
          activeHitboxRef.current = entity.getHitbox();
        }

        const entities = Array.from(hitboxes.values() || []);
        const boxes = entities.map((e) => e.getHitbox());
        const dragHitbox = adjustForMovement(
          activeHitboxRef.current,
          origin,
          position
        );

        const hits: Entity[] = [];
        const scrollHits: Entity[] = [];

        boxIntersect([dragHitbox], boxes).forEach((i) => {
          const hit = entities[i[1]];
          const data = hit.getData();

          if (data.accepts.includes(entity.getData().type)) {
            if (data.type === "scrollContainer") {
              scrollHits.push(hit);
            } else {
              hits.push(hit);
            }
          }
        });

        const primaryIntersection = getPrimaryIntersection(hits, dragHitbox);

        const scrollIntersections = getScrollIntersection(
          scrollHits,
          dragHitbox
        );

        const { add, update, remove } = getScrollIntersectionDiff(
          scrollIntersectionRef.current,
          scrollIntersections
        );

        add.forEach((e) => {
          eventContext.emit("beginScrollIntersect", id, ...e);
        });

        update.forEach((e) => {
          eventContext.emit("updateScrollIntersect", id, ...e);
        });

        remove.forEach((e) => {
          eventContext.emit("endScrollIntersect", id, ...e);
        });

        scrollIntersectionRef.current = scrollIntersections;

        if (
          primaryIntersectionRef.current &&
          primaryIntersectionRef.current !== primaryIntersection
        ) {
          eventContext.emit(
            "endDragIntersect",
            id,
            primaryIntersectionRef.current
          );
          primaryIntersectionRef.current = null;
        }

        if (
          primaryIntersection &&
          primaryIntersectionRef.current !== primaryIntersection
        ) {
          eventContext.emit("beginDragIntersect", id, primaryIntersection);
          primaryIntersectionRef.current = primaryIntersection;
        }
      }
    };

    const unsubscribers: Unsubscribe[] = [];

    unsubscribers.push(eventContext.on("dragStart", handler));
    unsubscribers.push(eventContext.on("dragMove", handler));
    unsubscribers.push(
      eventContext.on("dragEnd", () => {
        activeEntityRef.current = null;
        activeHitboxRef.current = null;
        setId(undefined);
        setOrigin(undefined);
        setPosition(undefined);
      })
    );

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [eventContext, hitboxManager]);

  if (!id || !position || !origin) {
    return null;
  }

  if (!activeEntityRef.current || !activeHitboxRef.current) {
    return null;
  }

  const hitbox = activeHitboxRef.current;
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

  return children(activeEntityRef.current, style, intersections);
}

interface ScrollContainerProps {
  children?: React.ReactNode;
  className?: string;
  orientation: Orientation;
  triggerTypes: string[];
}

export function ScrollContainer({
  className,
  children,
  orientation,
  triggerTypes,
}: ScrollContainerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <ScrollContext
      orientation={orientation}
      scrollRef={scrollRef}
      triggerTypes={triggerTypes}
    >
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
  data: EntityData;
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
  const hitboxManager = React.useContext(HitboxManagerContext);
  const eventContext = React.useContext(EventContext);
  const hitboxRef = React.useRef<HTMLDivElement>(null);
  const [shift, setShift] = React.useState(0);

  const shiftRef = React.useRef(shift);

  shiftRef.current = shift;

  const animate = React.useMemo(() => {
    return { y: shift };
  }, [shift]);

  React.useEffect(() => {
    const unsubscribe = [
      eventContext.on("beginDragIntersect", (dragId, intersectingEntity) => {
        const selfEntity = hitboxManager.getEntity(id);
        const dragEntity = hitboxManager.getEntity(dragId);

        if (dragEntity === intersectingEntity) {
          // TODO: intersecting with self
          return;
        }

        if (selfEntity && dragEntity && intersectingEntity) {
          const selfPath = selfEntity.pathRef.current.path;
          const intersectPath = intersectingEntity.pathRef.current.path;

          if (selfPath.length !== intersectPath.length) return;

          const isAfter = selfPath.every((step, i, arr) => {
            if (i === arr.length - 1) {
              return step >= intersectPath[i];
            }

            return step === intersectPath[i];
          });

          if (isAfter) {
            const dragHitbox = dragEntity.getHitbox();
            // TODO: orientation
            setShift(dragHitbox[2] - dragHitbox[0]);
          } else if (shiftRef.current) {
            setShift(0);
          }
        }
      }),
      eventContext.on("endDragIntersect", () => {
        if (shiftRef.current) {
          setShift(0);
        }
      }),
      eventContext.on("dragEnd", () => {
        if (shiftRef.current) {
          setShift(0);
        }
      }),
    ];

    return () => {
      unsubscribe.forEach((fn) => fn());
    };
  }, [hitboxManager, eventContext, id]);

  const onPointerDown: React.PointerEventHandler = React.useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      eventContext.emit("dragStartInternal", e.nativeEvent, id);

      const onMove = rafSchd((e: PointerEvent) => {
        eventContext.emit("dragMoveInternal", e, id);
      });

      const onEnd = (e: PointerEvent) => {
        eventContext.emit("dragEndInternal", e, id);

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [eventContext, id]
  );

  return (
    <HitboxContext data={data} hitboxRef={hitboxRef} id={id} index={index}>
      <motion.div
        ref={hitboxRef}
        animate={animate}
        transition={transition}
        className={classcat([className, "box"])}
        onPointerDown={onPointerDown}
      >
        {children}
      </motion.div>
    </HitboxContext>
  );
}
