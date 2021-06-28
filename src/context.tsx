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
  EntityPath,
  Orientation,
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
  dragScrollInternal(id: string): void;
  dragEndInternal(e: PointerEvent, id: string): void;
  dragStart(id: string, origin: Coordinates, position: Coordinates): void;
  dragMove(id: string, origin: Coordinates, position: Coordinates): void;
  dragEnd(
    id: string,
    origin: Coordinates,
    position: Coordinates,
    dropTarget: Entity | null
  ): void;

  beginDragIntersect(dragId: string, intersectingEntity: Entity): void;
  endDragIntersect(dragId: string, intersectingEntity: Entity): void;

  beginScrollIntersect(
    dragId: string,
    intersectingEntity: Entity,
    ratio: number
  ): void;
  updateScrollIntersect(
    dragId: string,
    intersectingEntity: Entity,
    ratio: number
  ): void;
  endScrollIntersect(
    dragId: string,
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

export const EntityContainerContext = React.createContext<
  React.MutableRefObject<Map<string, Entity> | null>
>(React.createRef());

export const EntityPathContext = React.createContext<
  React.RefObject<EntityPath>
>(React.createRef());

export const ScrollPathContext = React.createContext<
  React.RefObject<EntityPath>
>(React.createRef());

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

        emitter.emit("dragStart", id, dragOrigin, dragPosition);
      }),

      emitter.on("dragMoveInternal", (e, id) => {
        dragPosition = { x: e.screenX, y: e.screenY };

        emitter.emit(
          "dragMove",
          id,
          dragOrigin || { x: e.screenX, y: e.screenY },
          dragPosition
        );
      }),

      emitter.on("dragScrollInternal", (id) => {
        if (dragOrigin && dragPosition) {
          emitter.emit("dragMove", id, dragOrigin, dragPosition);
        }
      }),

      emitter.on("dragEndInternal", (e, id) => {
        emitter.emit(
          "dragEnd",
          id,
          dragOrigin || { x: e.screenX, y: e.screenY },
          { x: e.screenX, y: e.screenY },
          null
        );

        dragOrigin = undefined;
        dragPosition = undefined;
      }),
    ];

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [emitter]);

  React.useEffect(() => {
    const observer = new ResizeObserver(() => {
      clearInterval(debounceRef.current);

      debounceRef.current = window.setTimeout(() => {
        hitboxes.current.forEach((entry) => {
          entry.recalcInitial();
        });
      }, 120);
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
        {/* <DragManagerContext.Provider value={dragManager}> */}
        {children}
        {/* <DebugScrollContainers hitboxes={hitboxes} /> */}
        {/* </DragManagerContext.Provider> */}
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

  const beforePathRef = React.useRef<EntityPath>({
    get path() {
      return [...(parentScrollPathContainer.current?.path || []), 0];
    },
  });

  const afterPathRef = React.useRef<EntityPath>({
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
        getData() {
          return {
            id: beforeId,
            type: "scrollContainer",
            side: "before",
            orientation,
            accepts: triggerTypeRef.current || [],
            scrollContainer: scrollRef.current,
          };
        },
      };

      const afterHitbox: Entity = {
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
        getData() {
          return {
            id: afterId,
            type: "scrollContainer",
            side: "after",
            orientation,
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

      let dragId: string | null = null;
      let isScrolling = false;
      let scrollStrength = 0;
      let frame = 0;

      const scroll = (direction: "before" | "after") => {
        frame = requestAnimationFrame(() => {
          if (!isScrolling) return;

          scrollRef.current?.scrollBy({
            [orientation === "horizontal" ? "left" : "top"]:
              direction === "before"
                ? -25 * scrollStrength
                : 25 * scrollStrength,
          });

          if (dragId) {
            eventContext.emit("dragScrollInternal", dragId);
          }

          scroll(direction);
        });
      };

      const unsubscribers: Unsubscribe[] = [
        eventContext.on("beginScrollIntersect", (id, scrollEntity, ratio) => {
          if (scrollEntity === beforeHitbox) {
            dragId = id;
            isScrolling = true;
            scrollStrength = ratio;
            scroll("before");
          } else if (scrollEntity === afterHitbox) {
            dragId = id;
            isScrolling = true;
            scrollStrength = ratio;
            scroll("after");
          }
        }),

        eventContext.on("updateScrollIntersect", (_, scrollEntity, ratio) => {
          if (scrollEntity === beforeHitbox || scrollEntity === afterHitbox) {
            scrollStrength = ratio;
          }
        }),

        eventContext.on("endScrollIntersect", (_, scrollEntity) => {
          if (scrollEntity === beforeHitbox || scrollEntity === afterHitbox) {
            dragId = null;
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
  const eventContext = React.useContext(EventContext);
  const intersectionObserverEventContext = React.useContext(
    IntersectionObserverEventContext
  );
  const parentEntityContainer = React.useContext(EntityContainerContext);
  const parentPathContainer = React.useContext(EntityPathContext);
  const hitboxManager = React.useContext(HitboxManagerContext);
  const scrollRefContext = React.useContext(ScrollMotionContext);
  const scrollShiftRefContext = React.useContext(ScrollShiftContext);

  const pathRef = React.useRef<EntityPath>({
    get path() {
      return [...(parentPathContainer.current?.path || []), index];
    },
  });

  const entityRef = React.useRef<Entity | null>(null);
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
            entityRef.current = {
              initial: calculateHitbox(
                entry.boundingClientRect,
                scrollRefContext.current,
                scrollShiftRefContext.current
              ),
              scrollRef: scrollRefContext,
              scrollShiftRef: scrollShiftRefContext,
              pathRef: pathRef,
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
              getData() {
                return dataRef.current || {};
              },
            };

            eventContext.emit("registerHitbox", id, entityRef.current);
            entityContainerRef.current?.forEach((entity, id) => {
              eventContext.emit("registerHitbox", id, entity);
            });
            eventContext.emit("observeResize", target);
            parentEntityContainer.current?.set(id, entityRef.current);
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

    // These don't actually change
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
