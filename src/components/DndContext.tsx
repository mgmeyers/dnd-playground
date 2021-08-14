import React from "react";
import { DndManager } from "../managers/DndManager";
import { Entity, WithChildren } from "../types";
import { DndManagerContext } from "./context";
import { Scope } from "./Scope";
import { ScrollState } from "./ScrollStateContext";

interface DndContextProps extends WithChildren {
  id?: string;
  onDrop(dragEntity: Entity, dropEntity: Entity): void;
}

export function DndContext({ children, id, onDrop }: DndContextProps) {
  const onDropRef = React.useRef(onDrop);
  const dndManager = React.useMemo(() => {
    return new DndManager((dragEntity: Entity, dropEntity: Entity) =>
      onDropRef.current(dragEntity, dropEntity)
    );
  }, []);

  React.useEffect(() => {
    return () => {
      dndManager.destroy();
    };
  }, [dndManager]);

  onDropRef.current = onDrop;

  return (
    <Scope id={id}>
      <ScrollState>
        <DndManagerContext.Provider value={dndManager}>
          {children}
        </DndManagerContext.Provider>
      </ScrollState>
    </Scope>
  );
}
