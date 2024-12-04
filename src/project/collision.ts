import type { Transform } from "../engine/2d/transform";
import { SpatialHash } from "../engine/collections/spatial-hash";
import { read, write } from "../engine/ecs/component/component-access-descriptor";
import type { Entity } from "../engine/ecs/entity/entity";
import type { System } from "../engine/ecs/system/system";
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
      }
    },
  );
};
