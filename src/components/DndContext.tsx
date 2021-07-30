import React from "react";
import { DndManager } from "../managers/DndManager";
import { Entity, WithChildren } from "../types";
import { DndManagerContext } from "./context";
import { Scope } from "./Scope";

interface DndContextProps extends WithChildren {
  id?: string;
  onDrop(dragEntity: Entity, dropEntity: Entity): void;
}

export function DndContext({ children, id, onDrop }: DndContextProps) {
  const dndManager = React.useMemo(() => {
    return new DndManager(onDrop);
  }, [onDrop]);

  React.useEffect(() => {
    return () => dndManager.destroy();
  }, [dndManager]);

  return (
    <Scope id={id}>
      <DndManagerContext.Provider value={dndManager}>
        {children}
      </DndManagerContext.Provider>
    </Scope>
  );
}
