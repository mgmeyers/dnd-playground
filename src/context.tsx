import { ScrollMotionValues, useElementScroll } from "framer-motion";
import React from "react";
import { adjustHitbox, calculateHitbox, numberOrZero } from "./helpers";
import {
  Coordinates,
  Entity,
  EntityPath,
  ScrollShift,
  WithChildren,
} from "./types";

export interface HitboxManager {
  hitboxes: React.RefObject<Map<string, Entity>>;
  registerHitbox(id: string, entity: Entity): void;
  unregisterHitbox(id: string): void;
  getEntity(id: string): Entity | undefined;
}

export type IntersectionObserverHandler = (
  entry: IntersectionObserverEntry
) => void;

export interface IntersectionObserverManager {
  register(element: HTMLElement): void;
  unregister(element: HTMLElement): void;
  registerObserverHandler(
    id: string,
    handler: IntersectionObserverHandler
  ): void;
  unregisterObserverHandler(id: string): void;
}

export interface ResizeObserverManager {
  register(element: HTMLElement): void;
  unregister(element: HTMLElement): void;
}

export type DragHandler = (
  id: string,
  origin: Coordinates,
  position: Coordinates
) => void;

export interface DragManager {
  origin?: Coordinates;
  position?: Coordinates;
  activeId?: string;
  emitDragStart(e: PointerEvent, id: string): void;
  emitDragMove(e: PointerEvent): void;
  emitDragEnd(e: PointerEvent): void;
  registerListeners(
    onStart: DragHandler,
    onMove: DragHandler,
    onEnd: DragHandler
  ): void;
  unregisterListeners(
    onStart: DragHandler,
    onMove: DragHandler,
    onEnd: DragHandler
  ): void;
}

export const HitboxManagerContext = React.createContext<HitboxManager>({
  hitboxes: React.createRef(),
  registerHitbox() {},
  unregisterHitbox() {},
  getEntity() {
    return undefined;
  },
});

export const ResizeObserverManagerContext =
  React.createContext<ResizeObserverManager>({
    register() {},
    unregister() {},
  });

export const DragManagerContext = React.createContext<DragManager>({
  emitDragStart() {},
  emitDragMove() {},
  emitDragEnd() {},
  registerListeners() {},
  unregisterListeners() {},
});

export const ScrollMotionContext = React.createContext<
  React.MutableRefObject<ScrollMotionValues | null>
>(React.createRef());

export const ScrollShiftContext = React.createContext<
  React.RefObject<ScrollShift>
>(React.createRef());

export const IntersectionObserverManagerContext =
  React.createContext<IntersectionObserverManager | null>(null);

export const EntityContainerContext = React.createContext<
  React.MutableRefObject<Map<string, Entity> | null>
>(React.createRef());

export const EntityPathContext = React.createContext<
  React.RefObject<EntityPath>
>(React.createRef());

export function RootContext({ children }: WithChildren) {
  const debounceRef = React.useRef(-1);
  const hitboxes = React.useRef<Map<string, Entity>>(new Map());
  const hitboxManager = React.useMemo<HitboxManager>(
    () => ({
      hitboxes,
      getEntity(id: string) {
        return this.hitboxes.current?.get(id);
      },
      registerHitbox(id: string, entity: Entity) {
        this.hitboxes.current?.set(id, entity);
      },
      unregisterHitbox(id: string) {
        this.hitboxes.current?.delete(id);
      },
    }),
    []
  );

  const resizeObserver = React.useRef<ResizeObserver>();

  React.useEffect(() => {
    resizeObserver.current = new ResizeObserver(() => {
      clearInterval(debounceRef.current);

      debounceRef.current = window.setTimeout(() => {
        hitboxes.current.forEach((entry) => {
          entry.recalcInitial();
        });
      }, 120);
    });

    return () => resizeObserver.current?.disconnect();
  }, []);

  const resizeObserverManager = React.useMemo<ResizeObserverManager>(() => {
    return {
      register(element) {
        resizeObserver.current?.observe(element, { box: "border-box" });
      },
      unregister(element) {
        resizeObserver.current?.unobserve(element);
      },
    };
  }, []);

  const dragOrigin = React.useRef<Coordinates | undefined>();
  const dragPosition = React.useRef<Coordinates | undefined>();
  const activeId = React.useRef<string | undefined>();

  const dragStartListeners = React.useRef<Array<DragHandler>>([]);
  const dragMoveListeners = React.useRef<Array<DragHandler>>([]);
  const dragEndListeners = React.useRef<Array<DragHandler>>([]);

  const emitDragStart = React.useCallback((e: PointerEvent, id: string) => {
    activeId.current = id;
    dragOrigin.current = { x: e.screenX, y: e.screenY };
    dragPosition.current = { x: e.screenX, y: e.screenY };

    dragStartListeners.current.forEach((listener) => {
      if (activeId.current && dragOrigin.current && dragPosition.current) {
        listener(activeId.current, dragOrigin.current, dragPosition.current);
      }
    });
  }, []);

  const emitDragMove = React.useCallback((e: PointerEvent) => {
    dragPosition.current = { x: e.screenX, y: e.screenY };
    dragMoveListeners.current.forEach((listener) => {
      if (activeId.current && dragOrigin.current && dragPosition.current) {
        listener(activeId.current, dragOrigin.current, dragPosition.current);
      }
    });
  }, []);

  const emitDragEnd = React.useCallback(() => {
    dragEndListeners.current.forEach((listener) => {
      if (activeId.current && dragOrigin.current && dragPosition.current) {
        listener(activeId.current, dragOrigin.current, dragPosition.current);
      }
    });
    activeId.current = undefined;
    dragOrigin.current = undefined;
    dragPosition.current = undefined;
  }, []);

  const dragManager = React.useMemo<DragManager>(() => {
    return {
      emitDragStart,
      emitDragMove,
      emitDragEnd,
      get dragOrigin() {
        return dragOrigin.current;
      },
      get dragPosition() {
        return dragPosition.current;
      },
      get activeId() {
        return activeId.current;
      },
      registerListeners(onStart, onMove, onEnd) {
        dragStartListeners.current.push(onStart);
        dragMoveListeners.current.push(onMove);
        dragEndListeners.current.push(onEnd);
      },
      unregisterListeners(onStart, onMove, onEnd) {
        dragStartListeners.current = dragStartListeners.current.filter(
          (fn) => fn !== onStart
        );
        dragMoveListeners.current = dragMoveListeners.current.filter(
          (fn) => fn !== onMove
        );
        dragEndListeners.current = dragEndListeners.current.filter(
          (fn) => fn !== onEnd
        );
      },
    };
  }, [emitDragStart, emitDragMove, emitDragEnd]);

  return (
    <ResizeObserverManagerContext.Provider value={resizeObserverManager}>
      <HitboxManagerContext.Provider value={hitboxManager}>
        <DragManagerContext.Provider value={dragManager}>
          {children}
          {/* <Debug hitboxes={hitboxes} /> */}
        </DragManagerContext.Provider>
      </HitboxManagerContext.Provider>
    </ResizeObserverManagerContext.Provider>
  );
}

interface ScrollContextProps extends WithChildren {
  scrollRef: React.MutableRefObject<HTMLElement | null>;
}

export function ScrollContext({ scrollRef, children }: ScrollContextProps) {
  const scrollRefContext = React.useContext(ScrollMotionContext);
  const scrollShiftRefContext = React.useContext(ScrollShiftContext);
  const scrollValues = useElementScroll(scrollRef);
  const scrollMotionRef = React.useRef<ScrollMotionValues | null>(scrollValues);

  const observerHandlerMap = React.useRef<{
    [id: string]: IntersectionObserverHandler;
  }>({});

  const [observer, setObserver] = React.useState<IntersectionObserver | null>(
    null
  );

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
    if (!observer && scrollRef.current) {
      setObserver(
        new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.target instanceof HTMLElement) {
                const targetId = entry.target.dataset.hitboxid;

                if (targetId && observerHandlerMap.current[targetId]) {
                  observerHandlerMap.current[targetId](entry);
                }
              }
            });
          },
          {
            root: scrollRef.current,
            threshold: 0.5,
          }
        )
      );
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [observer, scrollRef]);

  const registerObserverHandler = React.useCallback(
    (id: string, handler: IntersectionObserverHandler) => {
      observerHandlerMap.current[id] = handler;
    },
    []
  );

  const unregisterObserverHandler = React.useCallback((id: string) => {
    delete observerHandlerMap.current[id];
  }, []);

  const register = React.useCallback(
    (element: HTMLElement) => {
      observer?.observe(element);
    },
    [observer]
  );

  const unregister = React.useCallback(
    (element: HTMLElement) => {
      observer?.unobserve(element);
    },
    [observer]
  );

  const contextValue = React.useMemo(
    () => ({
      registerObserverHandler,
      unregisterObserverHandler,
      register,
      unregister,
    }),
    [registerObserverHandler, unregisterObserverHandler, register, unregister]
  );

  return (
    <ScrollShiftContext.Provider value={scrollShiftRef}>
      <ScrollMotionContext.Provider value={scrollMotionRef}>
        <IntersectionObserverManagerContext.Provider value={contextValue}>
          {children}
        </IntersectionObserverManagerContext.Provider>
      </ScrollMotionContext.Provider>
    </ScrollShiftContext.Provider>
  );
}

interface HitboxContextProps extends WithChildren {
  id: string;
  index: number;
  hitboxRef: React.MutableRefObject<HTMLElement | null>;
  data?: Record<string, any>;
}

export function HitboxContext({
  id,
  index,
  hitboxRef,
  children,
  data,
}: HitboxContextProps) {
  const parentEntityContainer = React.useContext(EntityContainerContext);
  const parentPathContainer = React.useContext(EntityPathContext);
  const hitboxManager = React.useContext(HitboxManagerContext);
  const observerContext = React.useContext(IntersectionObserverManagerContext);
  const scrollRefContext = React.useContext(ScrollMotionContext);
  const scrollShiftRefContext = React.useContext(ScrollShiftContext);
  const resizeObserverContext = React.useContext(ResizeObserverManagerContext);

  const pathRef = React.useRef<EntityPath>({
    get path() {
      return [...(parentPathContainer.current?.path || []), index];
    },
  });

  const entityRef = React.useRef<Entity | null>(null);
  const entityContainerRef = React.useRef<Map<string, Entity> | null>(
    new Map()
  );

  const isDragging = false;
  const adjustHitboxMemoed = React.useCallback(adjustHitbox, []);

  const dataRef = React.useRef(data);

  dataRef.current = data;

  React.useEffect(() => {
    if (observerContext && hitboxRef.current) {
      const parentContainer = parentEntityContainer.current;
      const target = hitboxRef.current;

      target.dataset.hitboxid = id;

      observerContext.register(target);
      observerContext.registerObserverHandler(id, (entry) => {
        if (isDragging) {
          return;
        }

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

          hitboxManager.registerHitbox(id, entityRef.current);
          parentContainer?.set(id, entityRef.current);
          entityContainerRef.current?.forEach((entity, id) => {
            hitboxManager.registerHitbox(id, entity);
          });
          resizeObserverContext.register(target);
        } else if (!entry.isIntersecting) {
          hitboxManager.unregisterHitbox(id);
          parentContainer?.delete(id);
          entityContainerRef.current?.forEach((_, id) => {
            hitboxManager.unregisterHitbox(id);
          });
          resizeObserverContext.unregister(target);
        }
      });

      return () => {
        observerContext.unregister(target);
        observerContext.unregisterObserverHandler(id);
        hitboxManager.unregisterHitbox(id);
        parentContainer?.delete(id);
        resizeObserverContext.unregister(target);
      };
    }
  }, [
    isDragging,
    id,

    // These don't actually change
    hitboxRef,
    hitboxManager,
    observerContext,
    parentEntityContainer,
    resizeObserverContext,
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
