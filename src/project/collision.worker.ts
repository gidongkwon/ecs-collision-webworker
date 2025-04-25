import { intersects } from "../engine/math/rect";
import type { BoundsWithData } from "../engine/collections/spatial-hash";

self.onmessage = (e: MessageEvent) => {
  const objects = e.data as BoundsWithData<any>[];

  const collisions: [number, number][] = [];

  for (let i = 0; i < objects.length; i++) {
    const objA = objects[i];
    for (let j = i + 1; j < objects.length; j++) {
      const objB = objects[j];

      if (intersects(objA.bounds, objB.bounds)) {
        collisions.push([objA.data, objB.data]);
      }
    }
  }

  self.postMessage(collisions);
};