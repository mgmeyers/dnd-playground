import React from "react";
import { generateInstanceId } from "../util/data";
import { WithChildren } from "../types";
import { ScopeIdContext } from "./context";

interface ScopeProps extends WithChildren {
  id?: string;
}

export function Scope({ id, children }: ScopeProps) {
  const scopeId = React.useMemo(() => id || generateInstanceId(), [id]);

  return (
    <ScopeIdContext.Provider value={scopeId}>
      {children}
    </ScopeIdContext.Provider>
  );
}
