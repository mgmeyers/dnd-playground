import React from "react";
import classcat from "classcat";
import { generateInstanceId, TEST_BOARD } from "./data";
import {
  Coordinates,
  Entity,
  EntityData,
  Hitbox,
  Orientation,
  Path,
} from "./types";
import rafSchd from "raf-schd";
import boxIntersect from "box-intersect";
import {
  RootContext,
  ScrollContext,
  HitboxContext,
  HitboxManagerContext,
  EventContext,
  EntityPathContext,
  OrientationContext,
  ScopeIdContext,
  Scope,
} from "./context";
import {
  getBestIntersect,
  getScrollIntersection,
} from "./helpers";
import { areSiblings, getSiblingDirection, SiblingDirection } from "./path";
import { timings, transitions } from "./animation";
import { Unsubscribe } from "./emitter";
import { debounce } from "throttle-debounce";

export function DragStage() {
  return (
    <RootContext>
      <div className="app">
        <div className="app-header">Lorem Ipsum</div>
        <div className="app-body">
          <Scope>
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
                      <Placeholder
                        accepts={["item"]}
                        index={lane.children.length}
                      />
                    </ScrollContainer>
                  </HitboxComponent>
                );
              })}
              <Placeholder accepts={["lane"]} index={TEST_BOARD.length} />
            </ScrollContainer>
          </Scope>
        </div>
      </div>
      <DragOverlay>
        {(_, style, intersections) => (
          <>
            <div style={style} className="hitbox">
              DRAG
            </div>
            {/* <DebugIntersections hitboxes={intersections} /> */}
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

  const [entity, setEntity] = React.useState<Entity>();
  const [origin, setOrigin] = React.useState<Coordinates>();
  const [position, setPosition] = React.useState<Coordinates>();

  const entityRef = React.useRef(entity);
  const originRef = React.useRef(origin);
  const positionRef = React.useRef(position);

  entityRef.current = entity;
  originRef.current = origin;
  positionRef.current = position;

  const primaryIntersectionRef = React.useRef<Entity | null>(null);
  const scrollIntersectionRef = React.useRef<[Entity, number][]>([]);
  const initialDragHitboxRef = React.useRef<Hitbox | null>(null);

  const intersections: Entity[] = [];

  if (primaryIntersectionRef.current) {
    intersections.push(primaryIntersectionRef.current);
  }

  if (scrollIntersectionRef.current.length) {
    intersections.push(...scrollIntersectionRef.current.map(([e]) => e));
  }

  React.useEffect(() => {
    let isDragging = false;

    const handleIntersect = (
      dragEntity: Entity,
      origin: Coordinates,
      position: Coordinates
    ) => {
      if (!isDragging) return;

      const hitboxes = hitboxManager.hitboxes.current;

      if (hitboxes) {
        if (!initialDragHitboxRef.current) {
          initialDragHitboxRef.current = dragEntity.getHitbox();
        }

        const entities = Array.from(hitboxes.values() || []);
        const boxes = entities.map((e) => e.getHitbox());
        const dragHitbox = adjustForMovement(
          initialDragHitboxRef.current,
          origin,
          position
        );

        const hits: Entity[] = [];
        const scrollHits: Entity[] = [];

        boxIntersect([dragHitbox], boxes).forEach((i) => {
          const hit = entities[i[1]];
          const data = hit.getData();

          if (data.accepts.includes(dragEntity.getData().type)) {
            if (data.type === "scrollContainer") {
              scrollHits.push(hit);
            } else {
              hits.push(hit);
            }
          }
        });

        const scrollIntersections = getScrollIntersection(
          scrollHits,
          dragHitbox
        );

        const { add, update, remove } = getScrollIntersectionDiff(
          scrollIntersectionRef.current,
          scrollIntersections
        );

        add.forEach((e) => {
          eventContext.emit("beginScrollIntersect", dragEntity, ...e);
        });

        update.forEach((e) => {
          eventContext.emit("updateScrollIntersect", dragEntity, ...e);
        });

        remove.forEach((e) => {
          eventContext.emit("endScrollIntersect", dragEntity, ...e);
        });

        scrollIntersectionRef.current = scrollIntersections;

        const primaryIntersection = getBestIntersect(hits, dragHitbox);
        if (
          primaryIntersectionRef.current &&
          primaryIntersectionRef.current !== primaryIntersection
        ) {
          eventContext.emit(
            "endDragIntersect",
            dragEntity,
            primaryIntersectionRef.current
          );
          primaryIntersectionRef.current = null;
        }

        if (
          primaryIntersection &&
          primaryIntersectionRef.current !== primaryIntersection
        ) {
          eventContext.emit(
            "beginDragIntersect",
            dragEntity,
            primaryIntersection
          );
          primaryIntersectionRef.current = primaryIntersection;
        }
      }
    };

    const unsubscribers: Unsubscribe[] = [];

    const move = (
      dragEntity: Entity,
      origin: Coordinates,
      position: Coordinates
    ) => {
      if (
        positionRef.current?.x !== position.x ||
        positionRef.current?.y !== position.y
      ) {
        setPosition(position);
      }

      handleIntersect(dragEntity, origin, position);
    };

    const start = (
      dragEntity: Entity,
      origin: Coordinates,
      position: Coordinates
    ) => {
      isDragging = true;
      initialDragHitboxRef.current = dragEntity.getHitbox();

      setEntity(dragEntity);
      setOrigin(origin);
      setPosition(position);
    };

    unsubscribers.push(eventContext.on("dragStart", start));
    unsubscribers.push(eventContext.on("dragMove", move));
    unsubscribers.push(
      eventContext.on("dragEnd", () => {
        isDragging = false;
        initialDragHitboxRef.current = null;
        setEntity(undefined);
        setOrigin(undefined);
        setPosition(undefined);
      })
    );

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [eventContext, hitboxManager]);

  if (!entity || !position || !origin) {
    return null;
  }

  if (!initialDragHitboxRef.current) {
    return null;
  }

  const hitbox = initialDragHitboxRef.current;
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

interface HitboxProps {
  children?: React.ReactNode;
  className?: string;
  data: EntityData;
  id: string;
  index: number;
}

const initial: React.CSSProperties = {
  transition: transitions.outOfTheWay,
};

export function HitboxComponent({
  id,
  className,
  children,
  index,
  data,
}: HitboxProps) {
  const hitboxManager = React.useContext(HitboxManagerContext);
  const eventContext = React.useContext(EventContext);
  const parentPath = React.useContext(EntityPathContext);
  const scopeId = React.useContext(ScopeIdContext);
  const orientation = React.useContext(OrientationContext);

  const pathRef = React.useRef<Path>();

  pathRef.current = [...(parentPath.current?.path || []), index];

  const hitboxRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>(initial);

  const styleRef = React.useRef<React.CSSProperties>(style);

  styleRef.current = style;

  React.useEffect(() => {
    const shift = debounce(
      timings.outOfTheWay * 1000,
      (id: string, x: number, y: number) => {
        eventContext.emit("shiftEntity", id, {
          x,
          y,
        });
      }
    );

    const onEndDragIntersect = debounce(100, () => {
      if (styleRef.current !== initial) {
        setStyle(initial);
        shift(id, 0, 0);
      }
    });

    let dragHitboxAdjustments: Hitbox = [0, 0, 0, 0];

    const unsubscribe = [
      eventContext.on(
        "dragStart",
        (dragEntity, origin, position, adjustments) => {
          dragHitboxAdjustments = adjustments;
          if (!pathRef.current) return;

          const direction = getSiblingDirection(
            dragEntity.getPath(),
            pathRef.current
          );

          if (direction === SiblingDirection.Self) {
          }

          if (direction === SiblingDirection.After) {
            const hitbox = dragEntity.initial;
            const height =
              hitbox[3] +
              dragHitboxAdjustments[3] -
              hitbox[1] -
              dragHitboxAdjustments[1];
            const width =
              hitbox[2] +
              dragHitboxAdjustments[2] -
              hitbox[0] -
              dragHitboxAdjustments[0];
            const isHorizontal = orientation === "horizontal";

            setStyle({
              transition: transitions.none,
              transform: isHorizontal
                ? `translate3d(${width}px, 0, 0)`
                : `translate3d(0, ${height}px, 0)`,
            });

            eventContext.emit("shiftEntity", id, {
              x: isHorizontal ? width : 0,
              y: isHorizontal ? 0 : height,
            });
          }
        }
      ),
      eventContext.on(
        "beginDragIntersect",
        (dragEntity, intersectingEntity) => {
          const intersectionPath = intersectingEntity.getPath();

          if (
            dragEntity.getData().id === id ||
            dragEntity === intersectingEntity
          ) {
            return;
          }

          if (!pathRef.current || !dragEntity) {
            return;
          }

          if (scopeId !== dragEntity.scopeId) {
            // TODO: Different scopes
            return;
          }

          const direction = getSiblingDirection(
            intersectionPath,
            pathRef.current
          );

          onEndDragIntersect.cancel();

          if (
            direction === SiblingDirection.Self ||
            direction === SiblingDirection.After
          ) {
            const hitbox = dragEntity.initial;
            const height =
              hitbox[3] +
              dragHitboxAdjustments[3] -
              hitbox[1] -
              dragHitboxAdjustments[1];
            const width =
              hitbox[2] +
              dragHitboxAdjustments[2] -
              hitbox[0] -
              dragHitboxAdjustments[0];
            const isHorizontal = orientation === "horizontal";

            setStyle({
              transition: transitions.outOfTheWay,
              transform: isHorizontal
                ? `translate3d(${width}px, 0, 0)`
                : `translate3d(0, ${height}px, 0)`,
            });
            shift(id, isHorizontal ? width : 0, isHorizontal ? 0 : height);
          } else if (styleRef.current !== initial) {
            setStyle(initial);
            shift(id, 0, 0);
          }
        }
      ),
      eventContext.on("endDragIntersect", onEndDragIntersect),
      eventContext.on("dragEnd", () => {
        onEndDragIntersect.cancel();
        if (styleRef.current !== initial) {
          setStyle(initial);
          shift(id, 0, 0);
        }
      }),
    ];

    return () => {
      onEndDragIntersect.cancel();
      eventContext.emit("shiftEntity", id, {
        x: 0,
        y: 0,
      });
      unsubscribe.forEach((fn) => fn());
    };
  }, [orientation, scopeId, hitboxManager, eventContext, id]);

  const onPointerDown: React.PointerEventHandler = React.useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();

      eventContext.emit("dragStartInternal", e.nativeEvent, id);

      setStyle({ display: "none" });
      let _isDragging = true;

      const onMove = rafSchd((e: PointerEvent) => {
        if (_isDragging) {
          eventContext.emit("dragMoveInternal", e, id);
        }
      });

      const onEnd = (e: PointerEvent) => {
        _isDragging = false;
        setStyle(initial);
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
      <div
        style={style}
        ref={hitboxRef}
        className={classcat([className, "box"])}
        onPointerDown={onPointerDown}
      >
        {children}
      </div>
    </HitboxContext>
  );
}

interface PlaceholderProps {
  index: number;
  accepts: string[];
}

const initialPlaceholder: React.CSSProperties = {
  transition: transitions.placeholder,
};

export function Placeholder({ index, accepts }: PlaceholderProps) {
  const eventContext = React.useContext(EventContext);
  const parentPath = React.useContext(EntityPathContext);

  const [style, setStyle] =
    React.useState<React.CSSProperties>(initialPlaceholder);

  const hitboxRef = React.useRef<HTMLDivElement>(null);
  const pathRef = React.useRef<Path>();
  const styleRef = React.useRef<React.CSSProperties>(style);

  pathRef.current = [...(parentPath.current?.path || []), index];
  styleRef.current = style;

  const id = React.useMemo(() => generateInstanceId(), []);
  const data = React.useMemo<EntityData>(() => {
    return {
      id,
      type: "placeholder",
      accepts,
    };
  }, [id, accepts]);

  React.useEffect(() => {
    const onEndDragIntersect = debounce(100, () => {
      if (styleRef.current !== initialPlaceholder) {
        setStyle(initialPlaceholder);
      }
    });

    const unsubscribe = [
      eventContext.on(
        "beginDragIntersect",
        (dragEntity, intersectingEntity) => {
          const intersectionPath = intersectingEntity.getPath();

          onEndDragIntersect.cancel();
          if (
            pathRef.current &&
            (areSiblings(intersectionPath, pathRef.current) ||
              intersectingEntity.getData().id === id)
          ) {
            const hitbox = dragEntity.initial;
            const height = hitbox[3] - hitbox[1];
            const width = hitbox[2] - hitbox[0];
            setStyle({
              transition: transitions.placeholder,
              width,
              height,
            });
          } else if (styleRef.current !== initialPlaceholder) {
            setStyle(initialPlaceholder);
          }
        }
      ),
      eventContext.on("endDragIntersect", onEndDragIntersect),
      eventContext.on("dragEnd", () => {
        onEndDragIntersect.cancel();
        if (styleRef.current !== initialPlaceholder) {
          setStyle(initialPlaceholder);
        }
      }),
    ];

    return () => {
      unsubscribe.forEach((fn) => fn());
    };
  }, [eventContext, id]);

  return (
    <HitboxContext data={data} hitboxRef={hitboxRef} id={id} index={index}>
      <div
        style={style}
        ref={hitboxRef}
        data-is-placeholder={true}
        className={classcat(["placeholder"])}
      />
    </HitboxContext>
  );
}
