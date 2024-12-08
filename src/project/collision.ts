import { Mat4 } from "gl-matrix";
import type { Sprite } from "../engine/2d/sprite";
import type { Transform } from "../engine/2d/transform";
import { SpatialHash } from "../engine/collections/spatial-hash";
import { read, write } from "../engine/ecs/component/component-access-descriptor";
import type { Entity } from "../engine/ecs/entity/entity";
import type { System } from "../engine/ecs/system/system";
import type { Engine } from "../engine/engine";
import { type Collider, CollisionEvent } from "./definitions";

export const hash2d = new SpatialHash();

export const updateSpatialHashSystem: System = (context) => {
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
const queryResult: Set<Collider> = new Set();
export const collisionSystem: System = (context) => {
  const ColliderId = context.componentId("@my/Collider");

  context.each(
    [read(ColliderId)], (_, [collider]) => {
      collider.collidedThisFrame = false;
    }
  );

  collidedEntityCache.clear();
  context.each(
    [read(ColliderId)],
    (entityA, rawComponentsA) => {
      const [collider] = rawComponentsA as [Collider];
      queryResult.clear();
      // quadtree.query(collider.bounds, queryResult);
      hash2d.query(collider.bounds, queryResult);

      for (const result of queryResult) {
        const entityB = result.data;
        if (entityA === entityB) {
          continue;
        }

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

        collider.collidedThisFrame = true;
        result.collidedThisFrame = true;
      }
    },
  );
};

export function createBoundsRenderSystem(engine: Engine): System {
  return (context) => {
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
