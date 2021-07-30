import { LoremIpsum } from "lorem-ipsum";
import { Item, Lane, Nestable, Path } from "../types";
import update, { Spec } from "immutability-helper";
import { areSiblings } from "./path";
import merge from "deepmerge";

export function generateInstanceId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function generateItems(n: number) {
  const items: Item[] = [];
  const l = new LoremIpsum();

  for (let i = 0; i < n; i++) {
    items.push({
      id: generateInstanceId(),
      type: "item",
      accepts: ["item"],
      data: {
        title: l.generateSentences(1),
      },
      children: [],
    });
  }

  return items;
}

function generateLanes(n: number) {
  const lanes: Lane[] = [];
  const l = new LoremIpsum();

  for (let i = 0; i < n; i++) {
    lanes.push({
      id: generateInstanceId(),
      type: "lane",
      accepts: ["lane"],
      data: {
        title: l.generateWords(3),
      },
      children: generateItems(20),
    });
  }

  return lanes;
}

export const TEST_BOARD = generateLanes(8);

export function buildRemoveMutation(path: Path) {
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
  source: Path | null,
  destination: Path,
  entity: Nestable
) {
  const inSameList = source && areSiblings(source, destination);
  const len = destination.length;

  let destinationModifier = 1;

  if (inSameList && source && source[len - 1] < destination[len - 1]) {
    destinationModifier = 2;
  }

  let mutation: Spec<Nestable> = {
    children: {
      $splice: [[destination[len - destinationModifier], 0, entity]],
    },
  };

  for (let i = destination.length - 2; i >= 0; i--) {
    mutation = {
      children: {
        [destination[i]]: mutation,
      },
    };
  }

  return mutation;
}

export function getEntityFromPath(root: Nestable, path: Path): Nestable {
  const step = !!path.length && path[0];

  if (step !== false && root.children && root.children[step]) {
    return getEntityFromPath(root.children[step], path.slice(1));
  }

  return root;
}

export function moveEntity(root: Nestable, source: Path, destination: Path) {
  const entity = getEntityFromPath(root, source);
  const removeMutation = buildRemoveMutation(source);
  const insertMutation = buildInsertMutation(source, destination, entity);

  const updates = merge(removeMutation, insertMutation)

  return update(root, updates);
}

export function removeEntity(root: Nestable, target: Path) {
  return update(root, buildRemoveMutation(target));
}

export function insertEntity(
  root: Nestable,
  destination: Path,
  entity: Nestable
) {
  return update(root, buildInsertMutation(null, destination, entity));
}
