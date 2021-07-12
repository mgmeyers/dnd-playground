import React from "react";
import { WithChildren } from "../types";
import { ScrollManager } from "../managers/ScrollManager";
import {
  DndManagerContext,
  ScopeIdContext,
  ScrollManagerContext,
} from "./context";

interface ScrollContextProps extends WithChildren {
  scrollRef: React.MutableRefObject<HTMLElement | null>;
  triggerTypes?: string[];
}

export function Scrollable({
  scrollRef,
  triggerTypes,
  children,
}: ScrollContextProps) {
  const dndManager = React.useContext(DndManagerContext);
  const scopeId = React.useContext(ScopeIdContext);
  const parentScrollManager = React.useContext(ScrollManagerContext);
  const [scrollManager, setScrollManager] = React.useState<ScrollManager>();

  React.useEffect(() => {
    if (dndManager && scrollRef.current) {
      const manager = new ScrollManager(
        dndManager,
        scopeId,
        scrollRef.current,
        triggerTypes || ([] as string[]),
        parentScrollManager
      );

      setScrollManager(manager);

      return () => manager.destroy();
    }
  }, [dndManager, scopeId, scrollRef, triggerTypes, parentScrollManager]);

  React.useEffect(() => {
    const targetEl = scrollRef.current;

    if (!dndManager || !scrollManager || !targetEl) return;

    dndManager.observeResize(targetEl);

    const topId = scrollManager.top.getData().id;
    const rightId = scrollManager.right.getData().id;
    const bottomId = scrollManager.bottom.getData().id;
    const leftId = scrollManager.left.getData().id;

    if (parentScrollManager) {
      parentScrollManager.registerObserverHandler(
        scrollManager.id,
        targetEl,
        (entry) => {
          if (entry.isIntersecting) {
            dndManager.registerScrollEntity(topId, scrollManager.top);
            dndManager.registerScrollEntity(rightId, scrollManager.right);
            dndManager.registerScrollEntity(bottomId, scrollManager.bottom);
            dndManager.registerScrollEntity(leftId, scrollManager.left);
          } else {
            dndManager.unregisterScrollEntity(topId);
            dndManager.unregisterScrollEntity(rightId);
            dndManager.unregisterScrollEntity(bottomId);
            dndManager.unregisterScrollEntity(leftId);
          }
        }
      );
    } else {
      dndManager.registerScrollEntity(topId, scrollManager.top);
      dndManager.registerScrollEntity(rightId, scrollManager.right);
      dndManager.registerScrollEntity(bottomId, scrollManager.bottom);
      dndManager.registerScrollEntity(leftId, scrollManager.left);
    }

    return () => {
      parentScrollManager?.unregisterObserverHandler(
        scrollManager.id,
        targetEl
      );
      dndManager.unobserveResize(targetEl);
      dndManager.unregisterScrollEntity(topId);
      dndManager.unregisterScrollEntity(rightId);
      dndManager.unregisterScrollEntity(bottomId);
      dndManager.unregisterScrollEntity(leftId);
    };
  }, [dndManager, scrollManager, parentScrollManager, scrollRef]);

  if (!scrollManager) {
    return null;
  }

  return (
    <ScrollManagerContext.Provider value={scrollManager}>
      {children}
    </ScrollManagerContext.Provider>
  );
}
