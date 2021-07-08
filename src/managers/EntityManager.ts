import { adjustHitbox, calculateHitbox } from "../helpers";
import { Entity, EntityData, Path } from "../types";
import { ScrollManager } from "./ScrollManager";

export class EntityManager {
  id: string;
  index: number;
  scopeId: string;
  children: Map<string, Entity>;
  parent: EntityManager;
  scrollParent: ScrollManager;
  getEntityData: () => EntityData;

  entityNode: HTMLElement;

  constructor(
    entityNode: HTMLElement,
    scopeId: string,
    id: string,
    index: number,
    parent: EntityManager,
    scrollParent: ScrollManager,
    getEntityData: () => EntityData,
  ) {
    this.id = id;
    this.index = index;
    this.scopeId = scopeId;
    this.children = new Map();
    this.parent = parent;
    this.scrollParent = scrollParent;
    this.entityNode = entityNode;
    this.getEntityData = getEntityData;
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
        manager.scrollParent.scrollState,
        manager.scrollParent.getScrollShift(),
        // TODO: shift?
        null
      ),
      getParentScrollState() {
        return manager.scrollParent.scrollState;
      },
      getParentScrollShift() {
        return manager.scrollParent.getScrollShift();
      },
      recalcInitial() {
        this.initial = calculateHitbox(
          manager.entityNode.getBoundingClientRect(),
          manager.scrollParent.scrollState,
          manager.scrollParent.getScrollShift(),
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
        return this.pathRef.current.path;
      },
      getData() {
        return manager.getEntityData();
      },
    };
  }
}
