import { getDropDuration, transitions } from "../util/animation";
import { Axis, Entity, Hitbox } from "../types";
import { DndManager } from "./DndManager";
import { DragEventData } from "./DragManager";
import { getSiblingDirection, SiblingDirection } from "../util/path";

type EntityAndElement = [Entity, HTMLElement];

interface Dimensions {
  width: number;
  height: number;
}

const emptyDimensions: Dimensions = {
  width: 0,
  height: 0,
};

export const dragLeaveDebounceLength = 100;

export class SortManager {
  dndManager: DndManager;
  sortables: Map<string, EntityAndElement>;
  shifted: Set<string>;
  isSorting: boolean;
  axis: Axis;

  constructor(dndManager: DndManager, axis: Axis) {
    this.dndManager = dndManager;
    this.sortables = new Map();
    this.shifted = new Set();
    this.isSorting = false;
    this.axis = axis;

    dndManager.dragManager.emitter.on("dragStart", this.handleDragStart);
    dndManager.dragManager.emitter.on("dragEnd", this.handleDragEnd);
    dndManager.dragManager.emitter.on("dragEnter", this.handleDragEnter);
    dndManager.dragManager.emitter.on("dragLeave", this.handleDragLeave);
  }

  destroy() {
    clearTimeout(this.dragLeaveTimeout);
    clearTimeout(this.dragEndTimeout);

    this.dndManager.dragManager.emitter.off("dragStart", this.handleDragStart);
    this.dndManager.dragManager.emitter.off("dragEnd", this.handleDragEnd);
    this.dndManager.dragManager.emitter.off("dragEnter", this.handleDragEnter);
    this.dndManager.dragManager.emitter.off("dragLeave", this.handleDragLeave);
  }

  registerSortable(id: string, entity: Entity, el: HTMLElement) {
    el.style.setProperty("transition", transitions.outOfTheWay);
    this.sortables.set(id, [entity, el]);
  }

  unregisterSortable(id: string) {
    this.sortables.delete(id);
  }

  hitboxDimensions = emptyDimensions;

  handleDragStart = ({ dragEntity, dragEntityMargin }: DragEventData) => {
    const id = dragEntity?.getData().id;
    const haveSortable = id ? this.sortables.has(id) : null;

    if (!dragEntity || !haveSortable) {
      return;
    }

    console.log("SM: drag start");

    this.isSorting = true;

    this.hitboxDimensions = this.getHitboxDimensions(
      dragEntity.initial,
      dragEntityMargin
    );

    this.sortables.forEach(([entity, el]) => {
      const siblingDirection = getSiblingDirection(
        dragEntity.getPath(),
        entity.getPath()
      );
      const entityId = entity.getData().id;

      if (
        siblingDirection === SiblingDirection.After ||
        siblingDirection === SiblingDirection.Self
      ) {
        if (!this.shifted.has(entityId)) {
          this.shifted.add(entityId);
        }

        this.shiftEl(el, transitions.none, this.hitboxDimensions);
      }
    });
  };

  private dragEndTimeout = 0;
  handleDragEnd = ({
    primaryIntersection,
    dragPosition,
    dragOriginHitbox,
  }: DragEventData) => {
    if (!this.isSorting || !dragPosition || !dragOriginHitbox) {
      return;
    }

    clearTimeout(this.dragLeaveTimeout);

    console.log("SM: drag end");

    const dropHitbox = primaryIntersection?.getHitbox() || dragOriginHitbox;
    const dropDuration = getDropDuration({
      position: dragPosition,
      destination: {
        x: dropHitbox[0],
        y: dropHitbox[1],
      },
    });

    this.dragEndTimeout = window.setTimeout(() => {
      this.isSorting = false;
      this.sortables.forEach(([entity, el]) => {
        const entityId = entity.getData().id;

        if (this.shifted.has(entityId)) {
          this.shifted.delete(entityId);
          this.resetEl(el);
        }
      });
    }, dropDuration);

    this.hitboxDimensions = emptyDimensions;
  };

  handleDragEnter = ({
    dragEntity,
    dragEntityMargin,
    primaryIntersection,
  }: DragEventData) => {
    const id = primaryIntersection?.getData().id;
    const haveSortable = id ? this.sortables.has(id) : null;

    if (!dragEntity || !primaryIntersection || !haveSortable) {
      return;
    }

    clearTimeout(this.dragLeaveTimeout);

    this.isSorting = true;
    this.hitboxDimensions = this.getHitboxDimensions(
      dragEntity.initial,
      dragEntityMargin
    );
    this.sortables.forEach(([entity, el]) => {
      const siblingDirection = getSiblingDirection(
        primaryIntersection.getPath(),
        entity.getPath()
      );

      const entityId = entity.getData().id;

      if (
        siblingDirection === SiblingDirection.After ||
        siblingDirection === SiblingDirection.Self
      ) {
        if (!this.shifted.has(entityId)) {
          this.shifted.add(entityId);
        }

        this.shiftEl(el, transitions.outOfTheWay, this.hitboxDimensions);
      } else if (this.shifted.has(entityId)) {
        this.shifted.delete(entityId);
        this.resetEl(el);
      }
    });
  };

  private dragLeaveTimeout = 0;
  handleDragLeave = () => {
    if (!this.isSorting) return;

    clearTimeout(this.dragLeaveTimeout);
    this.dragLeaveTimeout = window.setTimeout(() => {
      this.isSorting = false;
      this.sortables.forEach(([entity, el]) => {
        const entityId = entity.getData().id;

        if (this.shifted.has(entityId)) {
          this.shifted.delete(entityId);
          this.resetEl(el);
        }
      });
    }, dragLeaveDebounceLength);

    this.hitboxDimensions = emptyDimensions;
  };

  getHitboxDimensions(hitbox: Hitbox, margin: Hitbox = [0, 0, 0, 0]) {
    const height = hitbox[3] + margin[3] - hitbox[1] - margin[1];
    const width = hitbox[2] + margin[2] - hitbox[0] - margin[0];
    return { width, height };
  }

  shiftEl(
    el: HTMLElement,
    transition: string,
    dimensions: { width: number; height: number }
  ) {
    el.style.setProperty("transition", transition);
    el.style.setProperty(
      "transform",
      this.axis === "horizontal"
        ? `translate3d(${dimensions.width}px, 0, 0)`
        : `translate3d(0, ${dimensions.height}px, 0)`
    );
  }

  resetEl(el: HTMLElement) {
    el.style.setProperty("transition", transitions.outOfTheWay);
    el.style.removeProperty("transform");
  }
}
