import rafSchd from "raf-schd";
import { generateInstanceId } from "../util/data";
import {
  adjustHitbox,
  calculateScrollHitbox,
  getElementScrollOffsets,
  numberOrZero,
} from "../util/hitbox";
import {
  CoordinateShift,
  Entity,
  initialScrollShift,
  initialScrollState,
  Path,
  ScrollState,
  Side,
} from "../types";
import { DndManager } from "./DndManager";
import { ScrollEventData } from "./DragManager";

export type IntersectionObserverHandler = (
  entry: IntersectionObserverEntry
) => void;

export const scrollContainerEntityType = "scroll-container";

export class ScrollManager {
  dndManager: DndManager;
  id: string;
  scopeId: string;
  triggerTypes: string[];
  scrollState: ScrollState;
  scrollEl: HTMLElement;
  parent: ScrollManager | null;

  observer: IntersectionObserver;
  observerHandlers: Map<string, IntersectionObserverHandler>;

  top: Entity;
  right: Entity;
  bottom: Entity;
  left: Entity;

  scrollFrame: number = 0;
  activeScroll: Map<Side, number>;

  constructor(
    dndManager: DndManager,
    scopeId: string,
    scrollEl: HTMLElement,
    triggerTypes: string[],
    parent: ScrollManager | null
  ) {
    this.dndManager = dndManager;
    this.id = generateInstanceId();
    this.scopeId = scopeId;
    this.scrollEl = scrollEl;
    this.triggerTypes = triggerTypes;
    this.scrollState = initialScrollState;
    this.parent = parent;
    this.activeScroll = new Map();

    this.top = this.createScrollEntity("top");
    this.right = this.createScrollEntity("right");
    this.bottom = this.createScrollEntity("bottom");
    this.left = this.createScrollEntity("left");

    this.bindScrollHandlers("top");
    this.bindScrollHandlers("right");
    this.bindScrollHandlers("bottom");
    this.bindScrollHandlers("left");

    this.observerHandlers = new Map();
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target instanceof HTMLElement) {
            const targetId = entry.target.dataset.hitboxid;

            if (targetId && this.observerHandlers.has(targetId)) {
              const handler = this.observerHandlers.get(targetId);
              handler && handler(entry);
            }
          }
        });
      },
      {
        root: scrollEl,
        threshold: 0.1,
      }
    );

    this.scrollEl.addEventListener("scroll", this.onScroll);
  }

  destroy() {
    this.observer.disconnect();
    this.unbindScrollHandlers("top");
    this.unbindScrollHandlers("right");
    this.unbindScrollHandlers("bottom");
    this.unbindScrollHandlers("left");
    this.scrollEl.removeEventListener("scroll", this.onScroll);
  }

  registerObserverHandler(
    id: string,
    element: HTMLElement,
    handler: IntersectionObserverHandler
  ) {
    this.observerHandlers.set(id, handler);
    this.observer.observe(element);
  }

  unregisterObserverHandler(id: string, element: HTMLElement) {
    this.observerHandlers.delete(id);
    this.observer.unobserve(element);
  }

  bindScrollHandlers(side: Side) {
    const id = `${this.id}-${side}`;
    this.dndManager.dragManager.emitter.on(
      "beginDragScroll",
      this.handleBeginDragScroll,
      id
    );
    this.dndManager.dragManager.emitter.on(
      "updateDragScroll",
      this.handleUpdateDragScroll,
      id
    );
    this.dndManager.dragManager.emitter.on(
      "endDragScroll",
      this.handleEndDragScroll,
      id
    );
  }

  unbindScrollHandlers(side: Side) {
    const id = `${this.id}-${side}`;
    this.dndManager.dragManager.emitter.off(
      "beginDragScroll",
      this.handleBeginDragScroll,
      id
    );
    this.dndManager.dragManager.emitter.off(
      "updateDragScroll",
      this.handleUpdateDragScroll,
      id
    );
    this.dndManager.dragManager.emitter.off(
      "endDragScroll",
      this.handleEndDragScroll,
      id
    );
  }

  onScroll = rafSchd(() => {
    this.scrollState = getElementScrollOffsets(this.scrollEl);
  });

  handleBeginDragScroll = ({
    scrollEntitySide,
    scrollStrength,
  }: ScrollEventData) => {
    this.activeScroll.set(scrollEntitySide, scrollStrength);
    this.handleDragScroll();
  };

  handleUpdateDragScroll = ({
    scrollEntitySide,
    scrollStrength,
  }: ScrollEventData) => {
    this.activeScroll.set(scrollEntitySide, scrollStrength);
  };

  handleEndDragScroll = ({ scrollEntitySide }: ScrollEventData) => {
    this.activeScroll.delete(scrollEntitySide);
  };

  isDoneScrolling(side: Side) {
    switch (side) {
      case "top":
        return this.scrollState.yPct === 0;
      case "right":
        return this.scrollState.xPct === 1;
      case "bottom":
        return this.scrollState.yPct === 1;
      case "left":
        return this.scrollState.xPct === 0;
    }
  }

  handleDragScroll() {
    if (this.activeScroll.size === 0) return;

    requestAnimationFrame(() => {
      const scrollBy = {
        left: 0,
        top: 0,
      };

      this.activeScroll.forEach((strength, side) => {
        if (this.isDoneScrolling(side)) {
          return this.activeScroll.delete(side);
        }

        const scrollKey = ["left", "right"].includes(side) ? "left" : "top";
        const shouldIncreaseScroll = ["right", "bottom"].includes(side);

        scrollBy[scrollKey] = shouldIncreaseScroll
          ? Math.max(13 - (13 * strength) / 35, 0)
          : Math.min(-13 + (13 * strength) / 35, 0);
      });

      this.scrollEl.scrollBy(scrollBy);

      this.handleDragScroll();
    });
  }

  getPath(side?: Side): Path {
    switch (side) {
      case "right":
        return [...(this.parent?.getPath() || []), 1];
      case "bottom":
        return [...(this.parent?.getPath() || []), 2];
      case "left":
        return [...(this.parent?.getPath() || []), 3];
    }

    // top
    return [...(this.parent?.getPath() || []), 0];
  }

  getScrollShift(): CoordinateShift {
    const parentShift = this.parent?.getScrollShift();

    return {
      x: this.scrollState.x + numberOrZero(parentShift?.x),
      y: this.scrollState.y + numberOrZero(parentShift?.y),
    };
  }

  createScrollEntity(side: Side): Entity {
    const manager = this;

    return {
      scopeId: this.scopeId,
      initial: calculateScrollHitbox(
        this.scrollEl.getBoundingClientRect(),
        this.parent?.scrollState || initialScrollState,
        this.parent?.getScrollShift() || initialScrollShift,
        side
      ),
      getParentScrollState() {
        return manager.parent?.scrollState || initialScrollState;
      },
      getParentScrollShift() {
        return manager.parent?.getScrollShift() || initialScrollShift;
      },
      recalcInitial() {
        this.initial = calculateScrollHitbox(
          manager.scrollEl.getBoundingClientRect(),
          manager.parent?.scrollState || initialScrollState,
          manager.parent?.getScrollShift() || initialScrollShift,
          side
        );
      },
      getHitbox() {
        return adjustHitbox(
          this.initial[0],
          this.initial[1],
          this.initial[2],
          this.initial[3],
          this.getParentScrollState(),
          this.getParentScrollShift()
        );
      },
      getPath() {
        return manager.getPath(side);
      },
      getData() {
        return {
          id: `${manager.id}-${side}`,
          type: scrollContainerEntityType,
          side: side,
          accepts: manager.triggerTypes || [],
          scrollContainer: manager.scrollEl,
        };
      },
    };
  }
}
