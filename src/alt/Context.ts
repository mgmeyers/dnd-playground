import React from "react";
import { DragContext } from "./types";

export interface Dimensions {
  width: number;
  height: number;
}

export const OverlayDimensionsContext = React.createContext<
  React.MutableRefObject<Dimensions | undefined>
>(React.createRef() as React.MutableRefObject<Dimensions | undefined>);

export const ActiveDragSetterContext = React.createContext<
  React.Dispatch<React.SetStateAction<DragContext | null>>
>(() => null);
