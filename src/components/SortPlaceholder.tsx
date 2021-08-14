import React from "react";
import { EntityData } from "../types";
import { generateInstanceId } from "../util/data";
import { Droppable } from "./Droppable";

interface SortPlaceholderProps {
  index: number;
  accepts: string[];
  className?: string;
}

export function SortPlaceholder({ index, accepts, className }: SortPlaceholderProps) {
  const elementRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);

  const data = React.useMemo<EntityData>(() => {
    return {
      id: generateInstanceId(),
      type: "placeholder",
      accepts,
    };
  }, [accepts]);

  return (
    <div ref={measureRef} className={className}>
      <div ref={elementRef} className="placeholder">
        <Droppable
          elementRef={elementRef}
          measureRef={measureRef}
          id={data.id}
          index={index}
          data={data}
        />
      </div>
    </div>
  );
}
