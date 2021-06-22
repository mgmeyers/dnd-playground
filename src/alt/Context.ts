import React from "react";

export interface Dimensions {
  width: number;
  height: number;
}

export const OverlayDimensionsContext = React.createContext<
  React.MutableRefObject<Dimensions | undefined>
>(React.createRef() as React.MutableRefObject<Dimensions | undefined>);
