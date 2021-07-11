import React from "react";
import { dragLeaveDebounceLength } from "../managers/SortManager";
import { EntityData } from "../types";
import { transitions } from "../util/animation";
import { generateInstanceId } from "../util/data";
import { DndManagerContext } from "./context";
import { Droppable } from "./Droppable";

interface SortPlaceholderProps {
  index: number;
  accepts: string[];
}

const initialPlaceholderStyle: React.CSSProperties = {
  transition: transitions.placeholder,
};

export function SortPlaceholder({ index, accepts }: SortPlaceholderProps) {
  const dndManager = React.useContext(DndManagerContext);
  const id = React.useMemo(() => generateInstanceId(), []);
  const [style, setStyle] = React.useState<React.CSSProperties>(
    initialPlaceholderStyle
  );

  const placeholderRef = React.useRef<HTMLDivElement>(null);

  const data = React.useMemo<EntityData>(() => {
    return {
      id,
      type: "placeholder",
      accepts,
    };
  }, [id, accepts]);

  React.useEffect(() => {
    let debounce = 0;

    dndManager?.dragManager.emitter.on(
      "dragEnter",
      ({ dragEntity }) => {
        if (!dragEntity) {
          return;
        }

        clearTimeout(debounce);

        const hitbox = dragEntity.initial;
        const height = hitbox[3] - hitbox[1];
        const width = hitbox[2] - hitbox[0];

        setStyle({
          transition: transitions.placeholder,
          width,
          height,
        });
      },
      id
    );

    dndManager?.dragManager.emitter.on(
      "dragLeave",
      () => {
        clearTimeout(debounce);
        debounce = window.setTimeout(() => {
          setStyle(initialPlaceholderStyle);
        }, dragLeaveDebounceLength);
      },
      id
    );
  }, [dndManager, id]);

  return (
    <Droppable elementRef={placeholderRef} id={id} index={index} data={data}>
      <div style={style} ref={placeholderRef} className="placeholder" />
    </Droppable>
  );
}
