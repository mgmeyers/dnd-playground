import { adjustHitbox, calculateHitbox, emptyDomRect } from "../util/hitbox";
import {
  CoordinateShift,
  Entity,
  EntityData,
  initialScrollShift,
  initialScrollState,
  Path,
} from "../types";
import { ScrollManager } from "./ScrollManager";
import { SortManager } from "./SortManager";
import { DndManager } from "./DndManager";

export class EntityManager {
  dndManager: DndManager;
  id: string;
  index: number;
  scopeId: string;
  children: Map<string, Entity>;
  parent: EntityManager | null;
  scrollParent: ScrollManager | null;
  sortManager: SortManager | null;
  getEntityData: () => EntityData;

  entityNode: HTMLElement;

  constructor(
    dndManager: DndManager,
    entityNode: HTMLElement,
    scopeId: string,
    id: string,
    index: number,
    parent: EntityManager | null,
    scrollParent: ScrollManager | null,
    sortManager: SortManager | null,
    getEntityData: () => EntityData
  ) {
    this.dndManager = dndManager;
    this.id = id;
    this.index = index;
    this.scopeId = scopeId;
    this.children = new Map();
    this.parent = parent;
    this.scrollParent = scrollParent;
    this.entityNode = entityNode;
    this.getEntityData = getEntityData;
    this.sortManager = sortManager;

    entityNode.dataset.hitboxid = id;
    sortManager?.registerSortable(id, this.getEntity(emptyDomRect), entityNode);

    if (this.scrollParent) {
      this.scrollParent.registerObserverHandler(id, entityNode, (entry) => {
        if (entry.isIntersecting) {
          const entity = this.getEntity(entry.boundingClientRect);
          dndManager.registerHitboxEntity(id, entity);
          this.children.forEach((child, childId) => {
            dndManager.registerHitboxEntity(childId, child);
          });
          parent?.children.set(id, entity);
          dndManager.observeResize(entityNode);
        } else {
          dndManager.unregisterHitboxEntity(id);
          this.children.forEach((_, childId) => {
            dndManager.unregisterHitboxEntity(childId);
          });
          parent?.children.delete(id);
          dndManager.unobserveResize(entityNode);
        }
      });
    } else {
      const entity = this.getEntity(entityNode.getBoundingClientRect());
      dndManager.observeResize(entityNode);
      dndManager.registerHitboxEntity(id, entity);
      parent?.children.set(id, entity);
    }
  }

  destroy() {
    this.dndManager.unobserveResize(this.entityNode);
    this.sortManager?.unregisterSortable(this.id);
    this.scrollParent?.unregisterObserverHandler(this.id, this.entityNode);
    this.dndManager.unregisterHitboxEntity(this.id);
    this.parent?.children.delete(this.id);
  }

  getPath(): Path {
    return [...(this.parent?.getPath() || []), this.index];
  }

  getSortShift(): CoordinateShift | null {
    if (this.sortManager?.isSorting && this.sortManager.shifted.has(this.id)) {
      const dimensions = this.sortManager.hitboxDimensions;
      const axis = this.sortManager.axis;
      return {
        x: axis === "horizontal" ? dimensions.width : 0,
        y: axis === "vertical" ? dimensions.height : 0,
      };
    }

    return null;
  }

  getEntity(rect: DOMRectReadOnly): Entity {
    const manager = this;
    return {
      scopeId: this.scopeId,
      initial: calculateHitbox(
        rect,
        manager.scrollParent?.scrollState || initialScrollState,
        manager.scrollParent?.getScrollShift() || initialScrollShift,
        manager.getSortShift()
      ),
      getParentScrollState() {
        return manager.scrollParent?.scrollState || initialScrollState;
      },
      getParentScrollShift() {
        return manager.scrollParent?.getScrollShift() || initialScrollShift;
      },
      recalcInitial() {
        this.initial = calculateHitbox(
          manager.entityNode.getBoundingClientRect(),
          manager.scrollParent?.scrollState || initialScrollState,
          manager.scrollParent?.getScrollShift() || initialScrollShift,
          manager.getSortShift()
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
        return manager.getPath();
      },
      getData() {
        return {
          ...manager.getEntityData(),
          sortAxis: manager.sortManager?.axis,
        };
      },
    };
  }
}
