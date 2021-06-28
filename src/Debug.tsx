import React from "react";
import { useRaf } from "./raf";
import { Hitbox, Entity } from "./types";

interface HitBoxDebugProps {
  hitbox: Hitbox;
  color: string;
  zIndex: number;
}

function HitBoxDebug({ color, hitbox, zIndex }: HitBoxDebugProps) {
  const style: React.CSSProperties = {
    borderColor: color,
    transform: `translate3d(${hitbox[0]}px, ${hitbox[1]}px, 0px)`,
    width: hitbox[2] - hitbox[0],
    height: hitbox[3] - hitbox[1],
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: zIndex,
    pointerEvents: "none",
  };

  return <div className="hitbox" style={style}></div>;
}

export function DebugScrollContainers({
  hitboxes,
}: {
  hitboxes: React.RefObject<Map<string, Entity>>;
}) {
  const [, update] = React.useState(0);

  useRaf(({ time }) => {
    update(time);
  }, []);

  if (!hitboxes.current) return null;

  return (
    <>
      {Array.from(hitboxes.current.entries())
        .filter(([id, hb]) => {
          return hb.getData().type === "scrollContainer";
        })
        .map(([id, hb]) => {
          return (
            <HitBoxDebug
              zIndex={9999}
              color="#8787d3"
              key={id}
              hitbox={hb.getHitbox()}
            />
          );
        })}
    </>
  );
}

export function Debug({
  hitboxes,
}: {
  hitboxes: React.RefObject<Map<string, Entity>>;
}) {
  const [, update] = React.useState(0);

  useRaf(({ time }) => {
    update(time);
  }, []);

  if (!hitboxes.current) return null;

  return (
    <>
      {Array.from(hitboxes.current.entries()).map(([id, hb]) => {
        const isScroll = hb.getData().type === "scrollContainer";
        return (
          <HitBoxDebug
            zIndex={isScroll ? 9999 : 8888}
            color={isScroll ? "#8787d3" : "#058294"}
            key={id}
            hitbox={hb.getHitbox()}
          />
        );
      })}
    </>
  );
}

export function DebugIntersections({ hitboxes }: { hitboxes: Entity[] }) {
  return (
    <>
      {hitboxes.map((hb, i) => {
        return (
          <HitBoxDebug
            zIndex={10000}
            color="tomato"
            key={i}
            hitbox={hb.getHitbox()}
          />
        );
      })}
    </>
  );
}
