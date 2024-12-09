import { Mat4 } from "gl-matrix";
import type { Transform } from "../engine/2d/transform";
import { SpatialHash } from "../engine/collections/spatial-hash";
import { read, write } from "../engine/ecs/component/component-access-descriptor";
import type { Entity } from "../engine/ecs/entity/entity";
import type { System } from "../engine/ecs/system/system";
import type { Engine } from "../engine/engine";
import { type Collider, CollisionEvent } from "./definitions";
import { SystemContext } from "../engine/ecs/system/system-context";

export const hash2d = new SpatialHash();

export const updateSpatialHashSystem: System = async (context) => {
  const TransformId = context.componentId("@scatter/Transform");
  const ColliderId = context.componentId("@my/Collider");

  hash2d.reset();
  context.each(
    [read(TransformId), write(ColliderId)],
    (entity, rawComponents) => {
      const [transform, collider] = rawComponents as [Transform, Collider];

      collider.bounds.x = transform.position.x;
      collider.bounds.y = transform.position.y;
      collider.data = entity;

      hash2d.insert(collider);
    },
  );
};

// const quadtree = new Quadtree<Entity>(
//   { x: 0, y: 0, width: 1000, height: 1000 },
//   40,
//   0,
//   3,
// );
// engine.signals.anyEntityDespawned.register((data) => {
//   if (engine.world.hasComponent(data.entity, ColliderId)) {
//     quadtree.remove(
//       engine.world.getComponent(data.entity, ColliderId) as Collider,
//     );
//   }
// });
// const updateColliderQuadtreeSystem: System = (context) => {
//   context.each(
//     [read(TransformId), write(ColliderId)],
//     (entity, rawComponents) => {
//       const [transform, collider] = rawComponents as [Transform, Collider];

//       collider.bounds.x = transform.position.x;
//       collider.bounds.y = transform.position.y;
//       collider.data = entity;

//       quadtree.update(collider);
//     },
//   );

//   quadtree.shrinkIfNeeded();
// };

const collidedEntityCache = new Map<Entity, Set<Entity>>();
const collisionsFromWorkers: [number, number][][] = [];
const workerPool: Worker[] = [];

export const collisionSystem: System = async (context) => {
  const ColliderId = context.componentId("@my/Collider");

  context.each(
    [read(ColliderId)],
    (_, [collider]) => {
      (collider as Collider).collidedThisFrame = false;
    }
  );

  collidedEntityCache.clear();

  const cells = hash2d.getCells();
  const cellEntries = Array.from(cells.entries());
  collisionsFromWorkers.length = cellEntries.length;

  // 워커 풀 설정
  while (workerPool.length < cellEntries.length) {
    const worker = new Worker(new URL('./collision.worker.ts', import.meta.url), { type: 'module' });
    workerPool.push(worker);
  }

  // 워커들의 작업을 Promise로 만들어 대기
  const workerPromises = cellEntries.map(([_, cellObjects], i) => {
    return new Promise<void>((resolve) => {
      const worker = workerPool[i];

      worker.onmessage = (e: MessageEvent) => {
        collisionsFromWorkers[i] = e.data as [number, number][];
        resolve();
      };

      worker.postMessage(Array.from(cellObjects));
    });
  });

  // 모든 워커의 작업 완료를 대기
  await Promise.all(workerPromises);

  const allCollisions = collisionsFromWorkers.flat();
  handleCollisions(allCollisions, context, ColliderId);
};

function handleCollisions(collisions: [number, number][], context: SystemContext, ColliderId: number) {
  for (const [entityA, entityB] of collisions) {
    const keyEntity = entityA > entityB ? entityA : entityB;
    const valueEntity = keyEntity === entityA ? entityB : entityA;
    if (collidedEntityCache.get(keyEntity)?.has(valueEntity)) {
      continue;
    }

    let collidedSet = collidedEntityCache.get(keyEntity);
    if (collidedSet == null) {
      collidedSet = new Set();
      collidedEntityCache.set(keyEntity, collidedSet);
    }
    collidedSet.add(valueEntity);
    context.createEvent(
      "collision",
      new CollisionEvent(entityA, entityB),
    );

    // collidedThisFrame 업데이트
    const colliderA = context.getComponent(entityA, read(ColliderId)) as Collider;
    const colliderB = context.getComponent(entityB, read(ColliderId)) as Collider;
    colliderA.collidedThisFrame = true;
    colliderB.collidedThisFrame = true;
  }
}

export function createBoundsRenderSystem(engine: Engine): System {
  return async (context) => {
    const ColliderId = context.componentId("@my/Collider");
  
    context.each(
      [read(ColliderId)],
      (_, rawComponents) => {
        const [collider] = rawComponents as [Collider];
  
        // render wireframe of the collider
        engine.gl.useProgram(engine.wireframeProgramInfo.program);
        engine.gl.bindVertexArray(engine.wireframeProgramInfo.vertexArray);

        const matrix = Mat4.create();
        Mat4.orthoNO(matrix, 0, engine.gl.canvas.width, engine.gl.canvas.height, 0, -1, 1);
        matrix.translate([collider.bounds.x, collider.bounds.y, 0]);
        matrix.scale([collider.bounds.width, collider.bounds.height, 1]);
        engine.gl.uniform1f(engine.wireframeProgramInfo.uniformLocations.collisionFlag, collider.collidedThisFrame ? 0 : 1);
        engine.gl.uniformMatrix4fv(engine.wireframeProgramInfo.uniformLocations.matrix, false, matrix);
        
        engine.gl.drawArrays(engine.gl.LINES, 0, 8);
      },
    );
  };
}
