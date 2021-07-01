import React from "react";
import { generateInstanceId } from "./data";
import {
  adjustHitbox,
  calculateHitbox,
  calculateScrollHitbox,
  getElementScrollOffsets,
  numberOrZero,
} from "./helpers";
import {
  Coordinates,
  Entity,
  EntityData,
  Orientation,
  Path,
  CoordinateShift,
  WithChildren,
  ScrollOffset,
  Hitbox,
} from "./types";
import { createEmitter, Emitter, Unsubscribe } from "./emitter";
// import { Debug } from "./Debug";
import rafSchd from "raf-schd";

export type IntersectionObserverHandler = (
  entry: IntersectionObserverEntry
) => void;

interface GlobalEvents {
  registerHitbox(id: string, entity: Entity): void;
  unregisterHitbox(id: string): void;

  observeResize(element: HTMLElement): void;
  unobserveResize(element: HTMLElement): void;

  dragStartInternal(e: PointerEvent, id: string): void;
  dragMoveInternal(e: PointerEvent, id: string): void;
  dragScrollInternal(dragEntity: Entity): void;
  dragEndInternal(e: PointerEvent, id: string): void;
  dragStart(
    dragEntity: Entity,
    origin: Coordinates,
    position: Coordinates,
    dragHitboxAdjustments: Hitbox
  ): void;
  dragMove(
    dragEntity: Entity,
    origin: Coordinates,
    position: Coordinates,
    dragHitboxAdjustments: Hitbox
  ): void;
  dragEnd(
    dragEntity: Entity,
    origin: Coordinates,
    position: Coordinates,
    dragHitboxAdjustments: Hitbox,
    dropTarget: Entity | null
  ): void;

  beginDragIntersect(dragEntity: Entity, intersectingEntity: Entity): void;
  endDragIntersect(dragEntity: Entity, intersectingEntity: Entity): void;

  beginScrollIntersect(
    dragEntity: Entity,
    intersectingEntity: Entity,
    ratio: number
  ): void;
  updateScrollIntersect(
    dragEntity: Entity,
    intersectingEntity: Entity,
    ratio: number
  ): void;
  endScrollIntersect(
    dragEntity: Entity,
    intersectingEntity: Entity,
    ratio: number
  ): void;

  shiftEntity(id: string, shift: CoordinateShift): void;
}

interface IntersectionObserverEvents {
  observeIntersection(element: HTMLElement): void;
  unobserveIntersection(element: HTMLElement): void;
  registerIntersectionHandler(
    id: string,
    handler: IntersectionObserverHandler
  ): void;
  unregisterIntersectionHandler(id: string): void;
}

export interface HitboxManager {
  hitboxes: React.RefObject<Map<string, Entity>>;
  getEntity(id: string): Entity | undefined;
}

export const EventContext = React.createContext<Emitter<GlobalEvents>>(
  createEmitter()
);

export const IntersectionObserverEventContext =
  React.createContext<Emitter<IntersectionObserverEvents> | null>(null);

export const HitboxManagerContext = React.createContext<HitboxManager>({
  hitboxes: React.createRef(),
  getEntity() {
    return undefined;
  },
});

export const ScrollOffsetContext = React.createContext<
  React.RefObject<ScrollOffset>
>(React.createRef());

export const ScrollShiftContext = React.createContext<
  React.RefObject<CoordinateShift>
>(React.createRef());

export const OrientationContext =
  React.createContext<Orientation>("horizontal");

export const EntityContainerContext = React.createContext<
  React.MutableRefObject<Map<string, Entity> | null>
>(React.createRef());

export const EntityPathContext = React.createContext<
  React.RefObject<{ path: Path }>
>(React.createRef());

export const ScrollPathContext = React.createContext<
  React.RefObject<{ path: Path }>
>(React.createRef());

export const ScopeIdContext = React.createContext<string>("");

export function Scope({ children }: WithChildren) {
  const scopeId = React.useMemo(() => generateInstanceId(), []);

  return (
    <ScopeIdContext.Provider value={scopeId}>
      {children}
    </ScopeIdContext.Provider>
  );
}

export function RootContext({ children }: WithChildren) {
  const debounceRef = React.useRef(-1);
  const hitboxes = React.useRef<Map<string, Entity>>(new Map());
  const hitboxManager = React.useMemo<HitboxManager>(
    () => ({
      hitboxes,
      getEntity(id: string) {
        return hitboxes.current.get(id);
      },
    }),
    []
  );
  const emitter = React.useMemo(() => {
    return createEmitter<GlobalEvents>();
  }, []);

  React.useEffect(() => {
    let dragOrigin: Coordinates | undefined;
    let dragPosition: Coordinates | undefined;
    let dragEntity: Entity | undefined;
    let dragHitboxAdjustments: Hitbox = [0, 0, 0, 0];

    const unsubscribers: Unsubscribe[] = [
      emitter.on("registerHitbox", (id, entity) => {
        hitboxes.current.set(id, entity);
      }),

      emitter.on("unregisterHitbox", (id) => {
        hitboxes.current.delete(id);
      }),

      emitter.on("dragStartInternal", (e, id) => {
        dragOrigin = { x: e.screenX, y: e.screenY };
        dragPosition = { x: e.screenX, y: e.screenY };
        dragEntity = hitboxManager.getEntity(id);

        const styles = getComputedStyle(e.target as HTMLElement);

        dragHitboxAdjustments = [
          parseFloat(styles.marginRight) || 0,
          parseFloat(styles.marginTop) || 0,
          parseFloat(styles.marginLeft) || 0,
          parseFloat(styles.marginBottom) || 0,
        ];

        if (dragEntity) {
          emitter.emit(
            "dragStart",
            dragEntity,
            dragOrigin,
            dragPosition,
            dragHitboxAdjustments
          );
        }
      }),

      emitter.on("dragMoveInternal", (e, id) => {
        dragPosition = { x: e.screenX, y: e.screenY };

        if (dragEntity) {
          emitter.emit(
            "dragMove",
            dragEntity,
            dragOrigin || { x: e.screenX, y: e.screenY },
            dragPosition,
            dragHitboxAdjustments
          );
        }
      }),

      emitter.on("dragScrollInternal", (dragEntity) => {
        if (dragOrigin && dragPosition) {
          emitter.emit(
            "dragMove",
            dragEntity,
            dragOrigin,
            dragPosition,
            dragHitboxAdjustments
          );
        }
      }),

      emitter.on("dragEndInternal", (e, id) => {
        if (dragEntity) {
          emitter.emit(
            "dragEnd",
            dragEntity,
            dragOrigin || { x: e.screenX, y: e.screenY },
            { x: e.screenX, y: e.screenY },
            dragHitboxAdjustments,
            null
          );
        }

        dragOrigin = undefined;
        dragPosition = undefined;
        dragEntity = undefined;
        dragHitboxAdjustments = [0, 0, 0, 0];
      }),
    ];

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [emitter, hitboxManager]);

  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      clearInterval(debounceRef.current);

      debounceRef.current = window.setTimeout(() => {
        hitboxes.current.forEach((entry) => {
          entry.recalcInitial();
        });
      }, 100);
    });

    const unsubscribers: Unsubscribe[] = [];

    unsubscribers.push(
      emitter.on("observeResize", (element) => {
        observer.observe(element, { box: "border-box" });
      })
    );

    unsubscribers.push(
      emitter.on("unobserveResize", (element) => {
        observer.unobserve(element);
      })
    );

    return () => {
      observer.disconnect();
      unsubscribers.forEach((fn) => fn());
    };
  }, [emitter]);

  return (
    <EventContext.Provider value={emitter}>
      <HitboxManagerContext.Provider value={hitboxManager}>
        {children}
        {/* <Debug hitboxes={hitboxManager.hitboxes} /> */}
      </HitboxManagerContext.Provider>
    </EventContext.Provider>
  );
}

interface ScrollContextProps extends WithChildren {
  orientation: Orientation;
  scrollRef: React.MutableRefObject<HTMLElement | null>;
  triggerTypes?: string[];
}

export function ScrollContext({
  orientation,
  scrollRef,
  triggerTypes,
  children,
}: ScrollContextProps) {
  const scrollId = React.useMemo(() => generateInstanceId(), []);
  const emitter = React.useMemo(() => {
    return createEmitter<IntersectionObserverEvents>();
  }, []);
  const scopeId = React.useContext(ScopeIdContext);
  const eventContext = React.useContext(EventContext);
  const parentEntityContainer = React.useContext(EntityContainerContext);
  const hitboxManager = React.useContext(HitboxManagerContext);
  const scrollRefContext = React.useContext(ScrollOffsetContext);
  const scrollShiftRefContext = React.useContext(ScrollShiftContext);
  const scrollOffsetRef = React.useRef<ScrollOffset>({
    x: 0,
    y: 0,
    xPct: 0,
    yPct: 0,
  });
  const parentScrollPathContainer = React.useContext(ScrollPathContext);
  const adjustHitboxMemoed = React.useCallback(adjustHitbox, []);
  const triggerTypeRef = React.useRef(triggerTypes);
  const [observerReady, setObserverReady] = React.useState(false);

  React.useEffect(() => {
    const scrollEl = scrollRef.current;

    if (!scrollEl) return;

    const onScroll = rafSchd(() => {
      scrollOffsetRef.current = getElementScrollOffsets(scrollEl);
    });

    scrollEl?.addEventListener("scroll", onScroll, {
      passive: true,
      capture: false,
    });

    onScroll();

    return () => {
      scrollEl?.removeEventListener("scroll", onScroll);
    };
  }, [scrollRef]);

  const beforePathRef = React.useRef<{ path: Path }>({
    get path() {
      return [...(parentScrollPathContainer.current?.path || []), 0];
    },
  });

  const afterPathRef = React.useRef<{ path: Path }>({
    get path() {
      return [...(parentScrollPathContainer.current?.path || []), 1];
    },
  });

  triggerTypeRef.current = triggerTypes;

  React.useEffect(() => {
    if (observerReady && scrollRef.current) {
      const beforeId = scrollId + "before";
      const afterId = scrollId + "after";
      const parentContainer = parentEntityContainer.current;

      const beforeHitbox: Entity = {
        scopeId,
        initial: calculateScrollHitbox(
          scrollRef.current.getBoundingClientRect(),
          scrollRefContext.current,
          scrollShiftRefContext.current,
          orientation,
          "before"
        ),
        scrollRef: scrollRefContext,
        scrollShiftRef: scrollShiftRefContext,
        pathRef: beforePathRef,
        getOrientation() {
          return orientation;
        },
        recalcInitial() {
          if (scrollRef.current) {
            this.initial = calculateScrollHitbox(
              scrollRef.current.getBoundingClientRect(),
              scrollRefContext.current,
              scrollShiftRefContext.current,
              orientation,
              "before"
            );
          }
        },
        getHitbox() {
          return adjustHitboxMemoed(
            this.initial[0],
            this.initial[1],
            this.initial[2],
            this.initial[3],
            this.scrollRef.current,
            this.scrollShiftRef.current
          );
        },
        getPath() {
          return this.pathRef.current.path;
        },
        getData() {
          return {
            id: beforeId,
            type: "scrollContainer",
            side: "before",
            accepts: triggerTypeRef.current || [],
            scrollContainer: scrollRef.current,
          };
        },
      };

      const afterHitbox: Entity = {
        scopeId,
        initial: calculateScrollHitbox(
          scrollRef.current.getBoundingClientRect(),
          scrollRefContext.current,
          scrollShiftRefContext.current,
          orientation,
          "after"
        ),
        scrollRef: scrollRefContext,
        scrollShiftRef: scrollShiftRefContext,
        pathRef: afterPathRef,
        getOrientation() {
          return orientation;
        },
        recalcInitial() {
          if (scrollRef.current) {
            scrollOffsetRef.current = getElementScrollOffsets(
              scrollRef.current
            );
            this.initial = calculateScrollHitbox(
              scrollRef.current.getBoundingClientRect(),
              scrollRefContext.current,
              scrollShiftRefContext.current,
              orientation,
              "after"
            );
          }
        },
        getHitbox() {
          return adjustHitboxMemoed(
            this.initial[0],
            this.initial[1],
            this.initial[2],
            this.initial[3],
            this.scrollRef.current,
            this.scrollShiftRef.current
          );
        },
        getPath() {
          return this.pathRef.current.path;
        },
        getData() {
          return {
            id: afterId,
            type: "scrollContainer",
            side: "after",
            accepts: triggerTypeRef.current || [],
            scrollContainer: scrollRef.current,
          };
        },
      };

      eventContext.emit("registerHitbox", beforeId, beforeHitbox);
      parentContainer?.set(beforeId, beforeHitbox);
      eventContext.emit("registerHitbox", afterId, afterHitbox);
      parentContainer?.set(afterId, afterHitbox);

      let dragEntity: Entity | null = null;
      let isScrolling = false;
      let scrollStrength = 0;
      let frame = 0;

      const scrollPctKey = orientation === "horizontal" ? "xPct" : "yPct";

      const isDoneScrolling = (direction: "before" | "after") => {
        if (
          direction === "after" &&
          scrollOffsetRef.current[scrollPctKey] === 1
        ) {
          return true;
        }

        if (
          direction === "before" &&
          scrollOffsetRef.current[scrollPctKey] === 0
        ) {
          return true;
        }

        return false;
      };

      const scroll = (direction: "before" | "after") => {
        if (isDoneScrolling(direction)) return;

        frame = requestAnimationFrame(() => {
          if (!isScrolling && isDoneScrolling(direction)) return;

          scrollRef.current?.scrollBy({
            [orientation === "horizontal" ? "left" : "top"]:
              direction === "before"
                ? Math.min(-13 + (13 * scrollStrength) / 35, 0)
                : Math.max(13 - (13 * scrollStrength) / 35, 0),
          });

          if (dragEntity) {
            eventContext.emit("dragScrollInternal", dragEntity);
          }

          scroll(direction);
        });
      };

      const unsubscribers: Unsubscribe[] = [
        eventContext.on("dragEnd", () => {
          if (isScrolling) {
            isScrolling = false;
          }
        }),

        eventContext.on(
          "beginScrollIntersect",
          (entity, scrollEntity, ratio) => {
            if (scrollEntity === beforeHitbox) {
              dragEntity = entity;
              isScrolling = true;
              scrollStrength = ratio;
              scroll("before");
            } else if (scrollEntity === afterHitbox) {
              dragEntity = entity;
              isScrolling = true;
              scrollStrength = ratio;
              scroll("after");
            }
          }
        ),

        eventContext.on("updateScrollIntersect", (_, scrollEntity, ratio) => {
          if (scrollEntity === beforeHitbox || scrollEntity === afterHitbox) {
            scrollStrength = ratio;
          }
        }),

        eventContext.on("endScrollIntersect", (_, scrollEntity) => {
          if (scrollEntity === beforeHitbox || scrollEntity === afterHitbox) {
            dragEntity = null;
            scrollStrength = 0;
            isScrolling = false;
            cancelAnimationFrame(frame);
          }
        }),
      ];

      return () => {
        if (hitboxManager.hitboxes.current?.has(beforeId)) {
          eventContext.emit("unregisterHitbox", beforeId);
        }

        if (parentContainer?.has(beforeId)) {
          parentContainer.delete(beforeId);
        }

        if (hitboxManager.hitboxes.current?.has(afterId)) {
          eventContext.emit("unregisterHitbox", afterId);
        }

        if (parentContainer?.has(afterId)) {
          parentContainer.delete(afterId);
        }

        unsubscribers.forEach((fn) => fn());
      };
    }
  }, [
    observerReady,
    orientation,
    scrollId,

    //
    scopeId,
    eventContext,
    adjustHitboxMemoed,
    hitboxManager,
    parentEntityContainer,
    scrollRef,
    scrollRefContext,
    scrollShiftRefContext,
  ]);

  const scrollShiftRef = React.useRef<CoordinateShift>({
    get x() {
      return (
        numberOrZero(scrollRefContext.current?.x) +
        numberOrZero(scrollShiftRefContext.current?.x)
      );
    },
    get y() {
      return (
        numberOrZero(scrollRefContext.current?.y) +
        numberOrZero(scrollShiftRefContext.current?.y)
      );
    },
  });

  React.useEffect(() => {
    if (scrollRef.current) {
      const handlerMap: {
        [id: string]: IntersectionObserverHandler;
      } = {};

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target instanceof HTMLElement) {
              const targetId = entry.target.dataset.hitboxid;

              if (targetId && handlerMap[targetId]) {
                handlerMap[targetId](entry);
              }
            }
          });
        },
        {
          root: scrollRef.current,
          threshold: 0.1,
        }
      );

      const unsubscribers: Unsubscribe[] = [];

      unsubscribers.push(
        emitter.on("registerIntersectionHandler", (id, handler) => {
          handlerMap[id] = handler;
        })
      );

      unsubscribers.push(
        emitter.on("unregisterIntersectionHandler", (id) => {
          delete handlerMap[id];
        })
      );

      unsubscribers.push(
        emitter.on("observeIntersection", (element) => {
          observer.observe(element);
        })
      );

      unsubscribers.push(
        emitter.on("unobserveIntersection", (element) => {
          observer.unobserve(element);
        })
      );

      setObserverReady(true);

      return () => {
        observer.disconnect();
        unsubscribers.forEach((fn) => fn());
      };
    }
  }, [scrollId, scrollRef, emitter]);

  return (
    <OrientationContext.Provider value={orientation}>
      <IntersectionObserverEventContext.Provider
        value={observerReady ? emitter : null}
      >
        <ScrollShiftContext.Provider value={scrollShiftRef}>
          <ScrollOffsetContext.Provider value={scrollOffsetRef}>
            <ScrollPathContext.Provider value={beforePathRef}>
              {children}
            </ScrollPathContext.Provider>
          </ScrollOffsetContext.Provider>
        </ScrollShiftContext.Provider>
      </IntersectionObserverEventContext.Provider>
    </OrientationContext.Provider>
  );
}

interface HitboxContextProps extends WithChildren {
  id: string;
  index: number;
  hitboxRef: React.MutableRefObject<HTMLElement | null>;
  data: EntityData;
}

export function HitboxContext({
  id,
  index,
  hitboxRef,
  children,
  data,
}: HitboxContextProps) {
  const orientation = React.useContext(OrientationContext);
  const scopeId = React.useContext(ScopeIdContext);
  const eventContext = React.useContext(EventContext);
  const intersectionObserverEventContext = React.useContext(
    IntersectionObserverEventContext
  );
  const parentEntityContainer = React.useContext(EntityContainerContext);
  const parentPathContainer = React.useContext(EntityPathContext);
  const hitboxManager = React.useContext(HitboxManagerContext);
  const scrollRefContext = React.useContext(ScrollOffsetContext);
  const scrollShiftRefContext = React.useContext(ScrollShiftContext);

  const pathRef = React.useRef<{ path: Path }>({
    get path() {
      return [...(parentPathContainer.current?.path || []), index];
    },
  });

  const entityContainerRef = React.useRef<Map<string, Entity> | null>(
    new Map()
  );

  const adjustHitboxMemoed = React.useCallback(adjustHitbox, []);
  const dataRef = React.useRef(data);

  dataRef.current = data;

  React.useEffect(() => {
    if (intersectionObserverEventContext && hitboxRef.current) {
      const target = hitboxRef.current;

      let shift: CoordinateShift = { x: 0, y: 0 };
      let shiftUnsubscribe: Unsubscribe | null = null;

      target.dataset.hitboxid = id;

      intersectionObserverEventContext.emit("observeIntersection", target);
      intersectionObserverEventContext.emit(
        "registerIntersectionHandler",
        id,
        (entry) => {
          if (entry.isIntersecting) {
            const entity: Entity = {
              scopeId,
              initial: calculateHitbox(
                entry.boundingClientRect,
                scrollRefContext.current,
                scrollShiftRefContext.current,
                shift
              ),
              scrollRef: scrollRefContext,
              scrollShiftRef: scrollShiftRefContext,
              pathRef: pathRef,
              getOrientation() {
                return orientation;
              },
              recalcInitial() {
                this.initial = calculateHitbox(
                  entry.target.getBoundingClientRect(),
                  scrollRefContext.current,
                  scrollShiftRefContext.current,
                  shift
                );
              },
              getHitbox() {
                return adjustHitboxMemoed(
                  this.initial[0],
                  this.initial[1],
                  this.initial[2],
                  this.initial[3],
                  this.scrollRef.current,
                  this.scrollShiftRef.current
                );
              },
              getPath() {
                return this.pathRef.current.path;
              },
              getData() {
                return dataRef.current || {};
              },
            };
            shiftUnsubscribe = eventContext.on(
              "shiftEntity",
              (entityId, entityShift) => {
                if (entityId === id) {
                  shift = entityShift;
                  entity.recalcInitial();
                }
              }
            );
            eventContext.emit("registerHitbox", id, entity);
            entityContainerRef.current?.forEach((entity, id) => {
              eventContext.emit("registerHitbox", id, entity);
            });
            parentEntityContainer.current?.set(id, entity);
            eventContext.emit("observeResize", target);
          } else if (!entry.isIntersecting) {
            eventContext.emit("unregisterHitbox", id);
            entityContainerRef.current?.forEach((_, id) => {
              eventContext.emit("unregisterHitbox", id);
            });
            parentEntityContainer.current?.delete(id);
            eventContext.emit("unobserveResize", target);
            if (shiftUnsubscribe) {
              shiftUnsubscribe();
            }
          }
        }
      );

      return () => {
        intersectionObserverEventContext.emit("unobserveIntersection", target);
        intersectionObserverEventContext.emit(
          "unregisterIntersectionHandler",
          id
        );
        eventContext.emit("unregisterHitbox", id);
        eventContext.emit("unobserveResize", target);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        parentEntityContainer.current?.delete(id);
      };
    }
  }, [
    id,
    intersectionObserverEventContext,
    orientation,

    // These don't actually change
    scopeId,
    eventContext,
    hitboxRef,
    hitboxManager,
    parentEntityContainer,
    scrollRefContext,
    scrollShiftRefContext,
    adjustHitboxMemoed,
  ]);

  return (
    <EntityPathContext.Provider value={pathRef}>
      <EntityContainerContext.Provider value={entityContainerRef}>
        {children}
      </EntityContainerContext.Provider>
    </EntityPathContext.Provider>
  );
}
