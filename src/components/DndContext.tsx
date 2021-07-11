import React from "react";
import { DndManager } from "../managers/DndManager";
import { WithChildren } from "../types";
import { DndManagerContext } from "./context";
import { Scope } from "./Scope";

interface DndContextProps extends WithChildren {
  id?: string;
}

export function DndContext({ children, id }: DndContextProps) {
  const dndManager = React.useMemo(() => {
    return new DndManager();
  }, []);

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
