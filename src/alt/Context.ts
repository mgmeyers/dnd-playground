import React from "react";

export interface Dimensions {
  width: number;
  height: number;
}

export const OverlayDimensionsContext = React.createContext<
  React.RefObject<Dimensions | undefined>
>(React.createRef());
