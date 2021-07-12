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
import { emptyDomRect } from "../util/hitbox";

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
    if (elementRef.current) {
      const manager = new EntityManager(
        elementRef.current,
        scopeId,
        id,
        index,
        parentEntityManager,
        parentScrollManager,
        () => ({ ...dataRef.current, sortAxis: sortManager?.axis })
      );

      setEntityManager(manager);

      return () => manager.destroy();
    }
  }, [
    id,
    index,
    elementRef,

    //
    scopeId,
    parentEntityManager,
    parentScrollManager,
    sortManager,
  ]);

  React.useEffect(() => {
    if (sortManager && entityManager && elementRef.current) {
      sortManager.registerSortable(
        id,
        entityManager.getEntity(emptyDomRect),
        elementRef.current
      );

      return () => {
        sortManager.unregisterSortable(id);
      };
    }
  }, [entityManager, sortManager, id, elementRef]);

  React.useEffect(() => {
    const targetEl = elementRef.current;

    if (!dndManager || !entityManager || !targetEl) return;

    dndManager.observeResize(targetEl);

    if (parentScrollManager) {
      parentScrollManager.registerObserverHandler(id, targetEl, (entry) => {
        if (entry.isIntersecting) {
          dndManager.registerHitboxEntity(
            id,
            entityManager.getEntity(entry.boundingClientRect)
          );
        } else {
          dndManager.unregisterHitboxEntity(id);
        }
      });
    } else {
      dndManager.registerHitboxEntity(
        id,
        entityManager.getEntity(targetEl.getBoundingClientRect())
      );
    }

    return () => {
      parentScrollManager?.unregisterObserverHandler(id, targetEl);
      dndManager.unregisterHitboxEntity(id);
      dndManager.unobserveResize(targetEl);
    };
  }, [id, entityManager, dndManager, parentScrollManager, elementRef]);

  if (!entityManager) {
    return null;
  }

  return (
    <EntityManagerContext.Provider value={entityManager}>
      {children}
    </EntityManagerContext.Provider>
  );
}
