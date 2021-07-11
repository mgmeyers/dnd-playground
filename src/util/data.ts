import { LoremIpsum } from "lorem-ipsum";
import { Item, Lane } from "../types";

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
