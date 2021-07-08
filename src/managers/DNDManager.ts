import { debounce } from "throttle-debounce";
import { createEmitter, Emitter } from "../emitter";
import { Entity } from "../types";
import { DragManager } from "./DragManager";

export class DNDManager {
  emitter: Emitter;
  hitboxEntities: Map<string, Entity>;
  scrollEntities: Map<string, Entity>;
  resizeObserver: ResizeObserver;
  dragManager: DragManager;

  constructor() {
    this.emitter = createEmitter();
    this.hitboxEntities = new Map();
    this.scrollEntities = new Map();

    this.resizeObserver = new ResizeObserver(
      debounce(100, () => {
        this.hitboxEntities.forEach((entity) => {
          entity.recalcInitial();
        });
        this.scrollEntities.forEach((entity) => {
          entity.recalcInitial();
        });
      })
    );

    this.dragManager = new DragManager(
      this.emitter,
      this.hitboxEntities,
      this.scrollEntities
    );
  }

  unload() {
    this.resizeObserver.disconnect();
  }

  observeResize(element: HTMLElement) {
    this.resizeObserver.observe(element, { box: "border-box" });
  }

  unobserveResize(element: HTMLElement) {
    this.resizeObserver.unobserve(element);
  }
}
