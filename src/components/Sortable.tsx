import React from "react";
import { SortManager } from "../managers/SortManager";
import { Axis, WithChildren } from "../types";
import { DndManagerContext, SortManagerContext } from "./context";

interface SortableProps extends WithChildren {
  axis: Axis;
}

export function Sortable({ axis, children }: SortableProps) {
  const dndManager = React.useContext(DndManagerContext);
  const [sortManager, setSortManager] = React.useState<SortManager>();

  React.useEffect(() => {
    if (dndManager) {
      const manager = new SortManager(dndManager, axis);

      setSortManager(manager);

      return () => {
        setTimeout(() => { manager.destroy(); });
      }
    }
  }, [dndManager, axis]);

  if (!sortManager) {
    return null;
  }

  return (
    <SortManagerContext.Provider value={sortManager}>
      {children}
    </SortManagerContext.Provider>
  );
}
