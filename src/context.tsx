import { ScrollMotionValues, useElementScroll } from "framer-motion";
import React from "react";
import { generateInstanceId } from "./data";
import {
  adjustHitbox,
  calculateHitbox,
  calculateScrollHitbox,
  numberOrZero,
} from "./helpers";
import {
  Coordinates,
  Entity,
  EntityData,
  Orientation,
  Path,
  ScrollShift,
  WithChildren,
} from "./types";
import { createEmitter, Emitter, Unsubscribe } from "./emitter";

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
    position: Coordinates
  ): void;
  dragMove(
    dragEntity: Entity,
    origin: Coordinates,
    position: Coordinates
  ): void;
  dragEnd(
    dragEntity: Entity,
    origin: Coordinates,
    position: Coordinates,
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

export const ScrollMotionContext = React.createContext<
  React.MutableRefObject<ScrollMotionValues | null>
>(React.createRef());

export const ScrollShiftContext = React.createContext<
  React.RefObject<ScrollShift>
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

        if (dragEntity) {
          emitter.emit("dragStart", dragEntity, dragOrigin, dragPosition);
        }
      }),

      emitter.on("dragMoveInternal", (e, id) => {
        dragPosition = { x: e.screenX, y: e.screenY };

        if (dragEntity) {
          emitter.emit(
            "dragMove",
            dragEntity,
            dragOrigin || { x: e.screenX, y: e.screenY },
            dragPosition
          );
        }
      }),

      emitter.on("dragScrollInternal", (dragEntity) => {
        if (dragOrigin && dragPosition) {
          emitter.emit("dragMove", dragEntity, dragOrigin, dragPosition);
        }
      }),

      emitter.on("dragEndInternal", (e, id) => {
        if (dragEntity) {
          emitter.emit(
            "dragEnd",
            dragEntity,
            dragOrigin || { x: e.screenX, y: e.screenY },
            { x: e.screenX, y: e.screenY },
            null
          );
        }

        dragOrigin = undefined;
        dragPosition = undefined;
        dragEntity = undefined;
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
  const scrollRefContext = React.useContext(ScrollMotionContext);
  const scrollShiftRefContext = React.useContext(ScrollShiftContext);
  const scrollValues = useElementScroll(scrollRef);
  const scrollMotionRef = React.useRef<ScrollMotionValues | null>(scrollValues);
  const parentScrollPathContainer = React.useContext(ScrollPathContext);
  const adjustHitboxMemoed = React.useCallback(adjustHitbox, []);
  const triggerTypeRef = React.useRef(triggerTypes);
  const [observerReady, setObserverReady] = React.useState(false);

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

      const scrollProgress =
        orientation === "horizontal"
          ? scrollValues.scrollXProgress
          : scrollValues.scrollYProgress;

      const updateHitboxes = () => {
        if (
          scrollProgress.get() > 0 &&
          !hitboxManager.hitboxes.current?.has(beforeId)
        ) {
          eventContext.emit("registerHitbox", beforeId, beforeHitbox);
          parentContainer?.set(beforeId, beforeHitbox);
        } else if (
          scrollProgress.get() === 0 &&
          hitboxManager.hitboxes.current?.has(beforeId)
        ) {
          eventContext.emit("unregisterHitbox", beforeId);
          parentContainer?.delete(beforeId);
        }

        if (
          scrollProgress.get() < 1 &&
          !hitboxManager.hitboxes.current?.has(afterId)
        ) {
          eventContext.emit("registerHitbox", afterId, afterHitbox);
          parentContainer?.set(afterId, afterHitbox);
        } else if (
          scrollProgress.get() === 1 &&
          hitboxManager.hitboxes.current?.has(afterId)
        ) {
          eventContext.emit("unregisterHitbox", afterId);
          parentContainer?.delete(afterId);
        }
      };

      const cancel = scrollProgress.onChange(updateHitboxes);

      updateHitboxes();

      let dragEntity: Entity | null = null;
      let isScrolling = false;
      let scrollStrength = 0;
      let frame = 0;

      const scroll = (direction: "before" | "after") => {
        frame = requestAnimationFrame(() => {
          if (!isScrolling) return;

          scrollRef.current?.scrollBy({
            [orientation === "horizontal" ? "left" : "top"]:
              direction === "before"
                ? Math.min(-13 + (13 * scrollStrength) / 30, 0)
                : Math.max(13 - (13 * scrollStrength) / 30, 0),
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

        cancel();
      };
    }
  }, [
    observerReady,
    orientation,
    scrollValues,
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

  const scrollShiftRef = React.useRef<ScrollShift>({
    get x() {
      return (
        numberOrZero(scrollRefContext.current?.scrollX.get()) +
        numberOrZero(scrollShiftRefContext.current?.x)
      );
    },
    get y() {
      return (
        numberOrZero(scrollRefContext.current?.scrollY.get()) +
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
          threshold: 0.25,
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
          <ScrollMotionContext.Provider value={scrollMotionRef}>
            <ScrollPathContext.Provider value={beforePathRef}>
              {children}
            </ScrollPathContext.Provider>
          </ScrollMotionContext.Provider>
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
  const scrollRefContext = React.useContext(ScrollMotionContext);
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
                scrollShiftRefContext.current
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
                  scrollShiftRefContext.current
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

            eventContext.emit("registerHitbox", id, entity);
            entityContainerRef.current?.forEach((entity, id) => {
              eventContext.emit("registerHitbox", id, entity);
            });
            eventContext.emit("observeResize", target);
            parentEntityContainer.current?.set(id, entity);
          } else if (!entry.isIntersecting) {
            eventContext.emit("unregisterHitbox", id);
            entityContainerRef.current?.forEach((_, id) => {
              eventContext.emit("unregisterHitbox", id);
            });
            eventContext.emit("unobserveResize", target);
            parentEntityContainer.current?.delete(id);
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
