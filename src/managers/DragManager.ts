import boxIntersect from "box-intersect";
import { Emitter } from "../emitter";
import {
  adjustHitboxForMovement,
  getBestIntersect,
  getScrollIntersection,
  getScrollIntersectionDiff,
} from "../helpers";
import { Coordinates, Entity, Hitbox } from "../types";

export class DragManager {
  emitter: Emitter;
  hitboxEntities: Map<string, Entity>;
  scrollEntities: Map<string, Entity>;

  dragEntity?: Entity;
  dragEntityId?: string;
  dragEntityMargin?: Hitbox;
  dragOrigin?: Coordinates;
  dragPosition?: Coordinates;

  primaryIntersection?: Entity;
  scrollIntersections?: [Entity, number][];

  constructor(
    emitter: Emitter,
    hitboxEntities: Map<string, Entity>,
    scrollEntities: Map<string, Entity>
  ) {
    this.hitboxEntities = hitboxEntities;
    this.scrollEntities = scrollEntities;
    this.emitter = emitter;
  }

  getDragEventData() {
    return {
      dragEntity: this.dragEntity,
      dragEntityId: this.dragEntityId,
      dragEntityMargin: this.dragEntityMargin,
      dragOrigin: this.dragOrigin,
      dragPosition: this.dragPosition,
      primaryIntersection: this.primaryIntersection,
      scrollIntersections: this.scrollIntersections,
    };
  }

  dragStart(e: PointerEvent) {
    const id = (e.target as HTMLElement).dataset.hitboxid;

    if (!id) return;

    const styles = getComputedStyle(e.target as HTMLElement);

    this.dragEntityId = id;
    this.dragOrigin = { x: e.screenX, y: e.screenY };
    this.dragPosition = { x: e.screenX, y: e.screenY };
    this.dragEntity = this.hitboxEntities.get(id);
    this.dragEntityMargin = [
      parseFloat(styles.marginRight) || 0,
      parseFloat(styles.marginTop) || 0,
      parseFloat(styles.marginLeft) || 0,
      parseFloat(styles.marginBottom) || 0,
    ];

    this.emitter.emit("dragStart", this.getDragEventData());
  }

  dragMove(e: PointerEvent) {
    this.dragPosition = { x: e.screenX, y: e.screenY };

    this.emitter.emit("dragMove", this.getDragEventData());

    this.calculateDragIntersect();
  }

  dragEnd(e: PointerEvent) {
    this.emitter.emit("dragEnd", this.getDragEventData());

    this.dragEntityMargin = undefined;
    this.dragEntity = undefined;
    this.dragEntityId = undefined;
    this.dragOrigin = undefined;
    this.dragPosition = undefined;
    this.scrollIntersections = undefined;
    this.primaryIntersection = undefined;
  }

  calculateDragIntersect() {
    if (!this.dragEntity || !this.dragPosition || !this.dragOrigin) return;

    const { type } = this.dragEntity.getData();

    const hitboxEntities: Entity[] = [];
    const hitboxHitboxes: Hitbox[] = [];
    const scrollEntities: Entity[] = [];
    const scrollHitboxes: Hitbox[] = [];

    this.hitboxEntities.forEach((entity) => {
      if (entity.getData().accepts.includes(type)) {
        hitboxEntities.push(entity);
        hitboxHitboxes.push(entity.getHitbox());
      }
    });

    this.scrollEntities.forEach((entity) => {
      if (entity.getData().accepts.includes(type)) {
        scrollEntities.push(entity);
        scrollHitboxes.push(entity.getHitbox());
      }
    });

    const dragHitbox = adjustHitboxForMovement(
      this.dragEntity.getHitbox(),
      this.dragOrigin,
      this.dragPosition
    );

    this.handleHitboxIntersect(dragHitbox, hitboxHitboxes, hitboxEntities);
    this.handleScrollIntersect(dragHitbox, scrollHitboxes, scrollEntities);
  }

  handleScrollIntersect(
    dragHitbox: Hitbox,
    hitboxes: Hitbox[],
    hitboxEntities: Entity[]
  ) {
    const scrollHits: Entity[] = boxIntersect([dragHitbox], hitboxes).map(
      (match) => hitboxEntities[match[1]]
    );

    const scrollIntersections = getScrollIntersection(scrollHits, dragHitbox);

    const { add, update, remove } = getScrollIntersectionDiff(
      this.scrollIntersections || [],
      scrollIntersections
    );

    add.forEach((e) => {
      this.emitter.emit("beginDragScroll", {
        ...this.getDragEventData(),
        scrollEntity: e[0],
        scrollStrength: e[1],
      });
    });

    update.forEach((e) => {
      this.emitter.emit("updateDragScroll", {
        ...this.getDragEventData(),
        scrollEntity: e[0],
        scrollStrength: e[1],
      });
    });

    remove.forEach((e) => {
      this.emitter.emit("endDragScroll", {
        ...this.getDragEventData(),
        scrollEntity: e[0],
        scrollStrength: e[1],
      });
    });

    this.scrollIntersections = scrollIntersections;
  }

  handleHitboxIntersect(
    dragHitbox: Hitbox,
    hitboxes: Hitbox[],
    hitboxEntities: Entity[]
  ) {
    const hits: Entity[] = boxIntersect([dragHitbox], hitboxes).map(
      (match) => hitboxEntities[match[1]]
    );

    const primaryIntersection = getBestIntersect(hits, dragHitbox);

    if (
      this.primaryIntersection &&
      this.primaryIntersection !== primaryIntersection
    ) {
      this.emitter.emit("dragLeave", this.dragEntity, this.primaryIntersection);
      this.primaryIntersection = undefined;
    }

    if (
      primaryIntersection &&
      this.primaryIntersection !== primaryIntersection
    ) {
      this.emitter.emit("dragEnter", this.dragEntity, primaryIntersection);
      this.primaryIntersection = primaryIntersection;
    }
  }
}
