interface EventsMap {
  [event: string]: any;
}

interface DefaultEvents extends EventsMap {
  [event: string]: (...args: any) => void;
}

export interface Unsubscribe {
  (): void;
}

export interface Emitter<Events extends EventsMap = DefaultEvents> {
  events: Partial<{ [E in keyof Events]: Array<Events[E]> }>;
  on<K extends keyof Events>(this: this, event: K, cb: Events[K]): Unsubscribe;
  emit<K extends keyof Events>(
    this: this,
    event: K,
    ...args: Parameters<Events[K]>
  ): void;
}

export function createEmitter<
  Events extends EventsMap = DefaultEvents
>(): Emitter<Events> {
  return {
    events: {},

    emit(event, ...args) {
      const handlers = this.events[event];

      if (handlers) {
        handlers.forEach((i) => i(...args));
      }
    },

    on(event, cb) {
      let handlers = this.events[event];
      if (!handlers) this.events[event] = handlers = [];

      handlers.push(cb);

      return () => {
        const handlers = this.events[event];

        if (handlers) {
          handlers.splice(handlers.indexOf(cb) >>> 0, 1);

          if (handlers.length === 0) {
            delete this.events[event];
          }
        }
      };
    },
  };
}
