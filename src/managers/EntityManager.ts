import { adjustHitbox, calculateHitbox } from "../util/hitbox";
import {
  Entity,
  EntityData,
  initialScrollShift,
  initialScrollState,
  Path,
} from "../types";
import { ScrollManager } from "./ScrollManager";

export class EntityManager {
  id: string;
  index: number;
  scopeId: string;
  children: Map<string, Entity>;
  parent: EntityManager | null;
  scrollParent: ScrollManager | null;
  getEntityData: () => EntityData;

  entityNode: HTMLElement;

  constructor(
    entityNode: HTMLElement,
    scopeId: string,
    id: string,
    index: number,
    parent: EntityManager | null,
    scrollParent: ScrollManager | null,
    getEntityData: () => EntityData
  ) {
    this.id = id;
    this.index = index;
    this.scopeId = scopeId;
    this.children = new Map();
    this.parent = parent;
    this.scrollParent = scrollParent;
    this.entityNode = entityNode;
    this.getEntityData = getEntityData;

    entityNode.dataset.hitboxid = id;
  }

  destroy() {}

  getPath(): Path {
    return [...(this.parent?.getPath() || []), this.index];
  }

  getEntity(rect: DOMRectReadOnly): Entity {
    const manager = this;
    return {
      scopeId: this.scopeId,
      initial: calculateHitbox(
        rect,
        manager.scrollParent?.scrollState || initialScrollState,
        manager.scrollParent?.getScrollShift() || initialScrollShift,
        // TODO: shift?
        null
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
          // TODO: shift?
          null
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
        return manager.getEntityData();
      },
    };
  }
}
