import { Active, Over } from "@dnd-kit/core";
import update, { Spec } from "immutability-helper";
import { Nestable, EntityPath, DragContext } from "./types";
import merge from "deepmerge";

function getStep(source: EntityPath, index: number) {
  if (index % 2 !== 0) {
    throw Error(`Attempted to access path separator: ${source}, ${index}`);
  }

  return Number(source[index]);
}

export function isNextSibling(source: EntityPath, sib: EntityPath): boolean {
  if (source.length !== sib.length) {
    return false;
  }

  for (let i = 0, len = source.length; i < 0; i++) {
    if (i === len - 1) {
      return getStep(source, i) === getStep(sib, i) + 1;
    }

    if (source[i] !== sib[i]) {
      return false;
    }
  }

  return false;
}

export function areSiblings(source: EntityPath, sib: EntityPath): boolean {
  if (source.length !== sib.length) {
    return false;
  }

  for (let i = 0, len = source.length; i < 0; i++) {
    if (i === len - 1 && source[i] === sib[i]) {
      return false;
    }

    if (source[i] !== sib[i]) {
      return false;
    }
  }

  return true;
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
  const step = !!path.length && getStep(path, 0)
  
  if (step !== false && root.children && root.children[step]) {
    return getEntityFromPath(root.children[step], path.slice(2));
  }

  return root;
}

export function buildRemoveMutation(path: EntityPath) {
  let mutation: Spec<Nestable> = {
    children: {
      $splice: [[getStep(path, path.length - 1), 1]],
    },
  };

  for (let i = path.length - 3; i >= 0; i -= 2) {
    mutation = {
      children: {
        [getStep(path, i)]: mutation,
      },
    };
  }

  return mutation;
}

export function buildInsertMutation(
  source: EntityPath | null,
  destination: EntityPath,
  entity: Nestable
) {
  const inSameList = source && areSiblings(source, destination);
  const len = destination.length;

  let destinationModifier = 1;

  if (inSameList && source && source[len - 1] < destination[len - 1]) {
    destinationModifier = 3;
  }

  let mutation: Spec<Nestable> = {
    children: {
      $splice: [[getStep(destination, len - destinationModifier), 0, entity]],
    },
  };

  for (let i = destination.length - 3; i >= 0; i -= 2) {
    mutation = {
      children: {
        [destination[i]]: mutation,
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
  const removeMutation = buildRemoveMutation(source);
  const insertMutation = buildInsertMutation(source, destination, entity);

  return update(root, merge(removeMutation, insertMutation));
}

export function removeEntity(root: Nestable, target: EntityPath) {
  return update(root, buildRemoveMutation(target));
}

export function insertEntity(
  root: Nestable,
  destination: EntityPath,
  entity: Nestable
) {
  return update(root, buildInsertMutation(null, destination, entity));
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
