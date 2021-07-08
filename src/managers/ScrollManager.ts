import rafSchd from "raf-schd";
import { generateInstanceId } from "../data";
import {
  adjustHitbox,
  calculateHitbox,
  getElementScrollOffsets,
  numberOrZero,
} from "../helpers";
import {
  CoordinateShift,
  Entity,
  Hitbox,
  Path,
  ScrollState,
  Side,
} from "../types";

export type IntersectionObserverHandler = (
  entry: IntersectionObserverEntry
) => void;

const initialScrollState: ScrollState = {
  x: 0,
  y: 0,
  xPct: 0,
  yPct: 0,
};

const initialScrollShift: CoordinateShift = {
  x: 0,
  y: 0,
};

export const scrollContainerEntityType = "scroll-container";

function calculateScrollHitbox(
  rect: DOMRectReadOnly,
  scroll: ScrollState | null,
  scrollShift: CoordinateShift | null,
  side: Side
): Hitbox {
  const hitbox = calculateHitbox(rect, scroll, scrollShift, null);

  if (side === "top") {
    hitbox[3] = hitbox[1] + 35;
    return hitbox;
  }

  if (side === "right") {
    hitbox[0] = hitbox[0] + rect.width - 35;
    return hitbox;
  }

  if (side === "bottom") {
    hitbox[1] = hitbox[1] + rect.height - 35;
    return hitbox;
  }

  // left
  hitbox[2] = hitbox[0] + 35;
  return hitbox;
}

export class ScrollManager {
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

  constructor(
    scopeId: string,
    scrollEl: HTMLElement,
    triggerTypes: string[],
    parent: ScrollManager | null
  ) {
    this.id = generateInstanceId();
    this.scopeId = scopeId;
    this.scrollEl = scrollEl;
    this.triggerTypes = triggerTypes;
    this.scrollState = initialScrollState;
    this.parent = parent;

    this.top = this.createScrollHitbox("top");
    this.right = this.createScrollHitbox("right");
    this.bottom = this.createScrollHitbox("bottom");
    this.left = this.createScrollHitbox("left");

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
  }

  destroy() {
    this.observer.disconnect();
  }

  onScroll = rafSchd(() => {
    this.scrollState = getElementScrollOffsets(this.scrollEl);
  });

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

  handleDragScroll(side: Side, scrollStrength: number) {
    if (this.isDoneScrolling(side)) return false;

    const scrollKey = ["left", "right"].includes(side) ? "left" : "top";
    const shouldIncreaseScroll = ["right", "bottom"].includes(side);

    this.scrollEl.scrollBy({
      [scrollKey]: shouldIncreaseScroll
        ? Math.max(13 - (13 * scrollStrength) / 35, 0)
        : Math.min(-13 + (13 * scrollStrength) / 35, 0),
    });

    return true;
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

  createScrollHitbox(side: Side): Entity {
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
          id: `${manager}-${side}`,
          type: scrollContainerEntityType,
          side: side,
          accepts: manager.triggerTypes || [],
          scrollContainer: manager.scrollEl,
        };
      },
    };
  }
}
