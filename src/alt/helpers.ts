import { Active, Over } from "@dnd-kit/core";
import update, { Spec } from "immutability-helper";
import { Nestable, EntityPath, DragContext } from "./types";

export function isNextSibling(source: EntityPath, sib: EntityPath): boolean {
  if (source.length !== sib.length) {
    return false;
  }

  return source.every((step, index) => {
    if (index === source.length - 1) {
      return step === sib[index] - 1;
    }

    return step === sib[index];
  });
}

export function areSiblings(source: EntityPath, sib: EntityPath): boolean {
  if (source.length !== sib.length) {
    return false;
  }

  return source.every((step, index) => {
    if (index === source.length - 1) {
      return step !== sib[index];
    }

    return step === sib[index];
  });
}

export enum SiblingDirection {
  Before,
  After,
  NotSiblings,
}

export function getSiblingDirection(
  source: EntityPath,
  sib: EntityPath
): SiblingDirection {
  if (!areSiblings(source, sib)) {
    return SiblingDirection.NotSiblings;
  }

  const lastIndex = source.length - 1;

  if (source[lastIndex] < sib[lastIndex]) {
    return SiblingDirection.After;
  }

  return SiblingDirection.Before;
}

export function getEntityFromPath(root: Nestable, path: EntityPath): Nestable {
  if (path[0] !== undefined && root.children && root.children[path[0]]) {
    return getEntityFromPath(root.children[path[0]], path.slice(1));
  }

  return root;
}

export function buildRemoveMutation(root: Nestable, path: EntityPath) {
  let mutation: Spec<Nestable> = {
    children: {
      $splice: [[path[path.length - 1], 1]],
    },
  };

  for (let i = path.length - 2; i >= 0; i--) {
    mutation = {
      children: {
        [path[i]]: mutation,
      },
    };
  }

  return mutation;
}

export function buildInsertMutation(
  root: Nestable,
  path: EntityPath,
  entity: Nestable
) {
  let mutation: Spec<Nestable> = {
    children: {
      $splice: [[path[path.length - 1], 0, entity]],
    },
  };

  for (let i = path.length - 2; i >= 0; i--) {
    mutation = {
      children: {
        [path[i]]: mutation,
      },
    };
  }

  return mutation;
}

export function moveEntity(
  root: Nestable,
  source: EntityPath,
  destination: EntityPath
) {
  const entity = getEntityFromPath(root, source);
  const newRoot = update(root, buildRemoveMutation(root, source));

  return update(newRoot, buildInsertMutation(root, destination, entity));
}

export function removeEntity(root: Nestable, target: EntityPath) {
  return update(root, buildRemoveMutation(root, target));
}

export function insertEntity(
  root: Nestable,
  destination: EntityPath,
  entity: Nestable
) {
  return update(root, buildInsertMutation(root, destination, entity));
}

export function isRelevantDrag(active: Active, over: Over | null) {
  if (!over) {
    return false;
  }

  const activeContext = active.data.current as DragContext;
  const overContext = over.data.current as DragContext;

  if (activeContext.type !== overContext.type) {
    return false;
  }

  if (activeContext.id === overContext.id) {
    return false;
  }

  if (isNextSibling(activeContext.path, overContext.path)) {
    return false;
  }

  return true;
}

export function getBoardFromDrag(
  root: Nestable,
  active: Active,
  over: Over | null
) {
  if (!active.data.current?.path || !over?.data.current?.path) {
    return null;
  }

  if (!isRelevantDrag(active, over)) {
    return null;
  }

  return moveEntity(root, active.data.current.path, over.data.current.path);
}
