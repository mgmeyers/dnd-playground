import React from "react";
import { EntityData, WithChildren } from "../types";
import { EntityManager } from "../managers/EntityManager";
import {
  DndManagerContext,
  EntityManagerContext,
  ScopeIdContext,
  ScrollManagerContext,
  SortManagerContext,
} from "./context";

interface DraggableProps extends WithChildren {
  id: string;
  index: number;
  elementRef: React.MutableRefObject<HTMLElement | null>;
  data: EntityData;
}

export function Droppable({
  id,
  index,
  elementRef,
  children,
  data,
}: DraggableProps) {
  const dndManager = React.useContext(DndManagerContext);
  const sortManager = React.useContext(SortManagerContext);
  const scopeId = React.useContext(ScopeIdContext);
  const parentEntityManager = React.useContext(EntityManagerContext);
  const parentScrollManager = React.useContext(ScrollManagerContext);
  const dataRef = React.useRef(data);

  const [entityManager, setEntityManager] = React.useState<EntityManager>();

  React.useEffect(() => {
    if (dndManager && elementRef.current) {
      const manager = new EntityManager(
        dndManager,
        elementRef.current,
        scopeId,
        id,
        index,
        parentEntityManager,
        parentScrollManager,
        sortManager,
        () => dataRef.current
      );

      setEntityManager(manager);

      return () => manager.destroy();
    }
  }, [
    id,
    index,
    elementRef,

    //
    dndManager,
    scopeId,
    parentEntityManager,
    parentScrollManager,
    sortManager,
  ]);

  if (!entityManager) {
    return null;
  }

  return (
    <EntityManagerContext.Provider value={entityManager}>
      {children}
    </EntityManagerContext.Provider>
  );
}
