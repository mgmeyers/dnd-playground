export type MapAny = { [k: string]: any };

export function areArraysEqual(a: any[], b: any[]) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
}

function is(x: any, y: any): boolean {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    // eslint-disable-next-line
    return x !== x && y !== y;
  }
}

type CustomComparator = (k: string, a: any, b: any) => boolean;

export function shallowEqual(
  objA: MapAny,
  objB: MapAny,
  customCompare: CustomComparator = () => false
): boolean {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(objB, keysA[i])) {
      return false;
    }
    if (
      !is(objA[keysA[i]], objB[keysA[i]]) &&
      !customCompare(keysA[i], objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

export function areEqualWithPath(objA: MapAny, objB: MapAny) {
  return shallowEqual(objA, objB, (k, a, b) => {
    if (k === "path") {
      return areArraysEqual(a, b);
    }

    return is(a, b);
  });
}

export function areEqualWithCtx(objA: MapAny, objB: MapAny) {
  return shallowEqual(objA, objB, (k, a, b) => {
    if (k === "ctx") {
      return areEqualWithPath(a, b);
    }

    return is(a, b);
  });
}

