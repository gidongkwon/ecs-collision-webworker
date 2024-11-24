import { toRadian } from 'gl-matrix/common';
import type { Sprite } from './engine/2d/sprite';
import type { Transform } from './engine/2d/transform';
import { SpatialHash, type BoundsWithData } from './engine/collections/spatial-hash';
import { read, write } from './engine/ecs/component/component-access-descriptor';
import type { Entity } from './engine/ecs/entity/entity';
import { ScatterEvent } from './engine/ecs/event/event';
import type { System } from './engine/ecs/system/system';
import { Engine } from './engine/engine';
import { Timer } from './engine/timer/timer';
import { assert } from './engine/utils/assert';
import './style.css'

const gameCanvas = document.querySelector<HTMLCanvasElement>('#game')!

const engine = new Engine(gameCanvas);

const tempComponentIds = `
const TransformId = 0;
const SpriteId = 1;
const VelocityId = 2;
const PlayerId = 3;
const EnemyId = 4;
const BulletShooterId = 5;
const RemoveOnOutsideId = 6;
const ColliderId = 7;
`;

await engine.loadProject({
  name: "test",
  assets: [
    {
      type: "texture",
      name: "player-ship",
      path: "/shooter/playerShip1_blue.png",
    },
    {
      type: "texture",
      name: "enemy-ship",
      path: "/shooter/playerShip3_red.png",
    },
    {
      type: "texture",
      name: "player-bullet",
      path: "/shooter/Lasers/laserBlue01.png",
    },
  ],
  systems: [
    {
      id: 0,
      name: "Move Player",
      code: `${tempComponentIds}
context.each([write(0), read(1), read(3)], (_, [transform]) => {
  const speed = 300;
  if (context.keyboard.isPressed("ArrowLeft")) {
    transform.position.x -= speed * context.deltaTime;
  }
  if (context.keyboard.isPressed("ArrowRight")) {
    transform.position.x += speed * context.deltaTime;
  }
  if (context.keyboard.isPressed("ArrowUp")) {
    transform.position.y -= speed * context.deltaTime;
  }
  if (context.keyboard.isPressed("ArrowDown")) {
    transform.position.y += speed * context.deltaTime;
  }
});`,
    },
    {
      id: 1,
      name: "Create Player",
      code: `
${tempComponentIds}
const playerTexture = context.assets.texture("player-ship");
      
context.spawn("Player", [
  [
    TransformId,
    {
      position: {
        x: 100,
        y: 100,
      },
      rotation: Math.PI,
      scale: {
        x: 0.5,
        y: 0.5,
      },
    },
  ],
  [
    SpriteId,
    { textureInfo: playerTexture, width: 1, height: 1 },
  ],
  [PlayerId, { score: 0 }],
  [
    BulletShooterId,
    {
      delayTimer: new Timer(0.1, { type: "once" }),
      offset: {
        x: playerTexture.width / 2,
        y: playerTexture.height / 2 / 2,
      },
    },
  ],
  [
    ColliderId,
    {
      data: -1,
      bounds: {
        x: 0,
        y: 0,
        width: playerTexture.width,
        height: playerTexture.height,
      },
    },
  ],
]);`,
    },
  ],
  components: [],
  scenes: [
    {
      name: "Shooter Test",
      entities: [],
      scripts: {
        init: [1],
        update: [0],
        render: [],
      },
    },
  ],
});

const TransformId = 0;
const SpriteId = 1;
const VelocityId = engine.world.registerComponent("@my/Velocity");
interface Velocity {
  x: number;
  y: number;
}
const PlayerId = engine.world.registerComponent("@my/Player");
interface Player {
  score: number;
}
const EnemyId = engine.world.registerComponent("@my/Enemy");
const BulletId = engine.world.registerComponent("@my/Bullet");
interface Bullet {
  owner: Entity;
}
const BulletShooterId = engine.world.registerComponent("@my/BulletShooter");
interface BulletShooter {
  delayTimer: Timer;
  offset: {
    x: number;
    y: number;
  };
}
const RemoveOnOutsideId = engine.world.registerComponent(
  "@my/RemoveOnOutside",
);
const ColliderId = engine.world.registerComponent("@my/Collider");
interface Collider extends BoundsWithData<Entity> {}

engine.world.registerEvent("collision");
class CollisionEvent extends ScatterEvent {
  name = "collision";
  constructor(
    public a: Entity,
    public b: Entity,
  ) {
    super();
  }
}

engine.loadScene(engine.project!.scenes[0], engine.project!.systems);

const playerTexture = engine.assets.texture("player-ship");
const playerBulletTexture = engine.assets.texture("player-bullet");
const enemyTexture = engine.assets.texture("enemy-ship");

if (
  playerTexture == null ||
  playerBulletTexture == null ||
  enemyTexture == null
) {
  throw new Error("텍스쳐 로딩 실패");
}

const playerShootSystem: System = (context) => {
  context.each(
    [read(TransformId), write(BulletShooterId), read(PlayerId)],
    (shooter, rawComponents) => {
      const [playerTransform, bulletShooter] = rawComponents as [
        Transform,
        BulletShooter,
      ];
      bulletShooter.delayTimer.tick(context.deltaTime);
      if (!bulletShooter.delayTimer.finished) {
        return;
      }

      if (context.keyboard.isPressed("KeyZ")) {
        bulletShooter.delayTimer.reset();
        context.spawn("Bullet", [
          [
            SpriteId,
            {
              textureInfo: playerBulletTexture,
              width: 1,
              height: 1,
            } satisfies Sprite,
          ],
          [
            TransformId,
            {
              position: {
                x: playerTransform.position.x,
                y: playerTransform.position.y,
              },
              rotation: toRadian(90),
              scale: {
                x: 1,
                y: 1,
              },
            } satisfies Transform,
          ],
          [
            VelocityId,
            {
              x: 700,
              y: 0,
            } satisfies Velocity,
          ],
          [RemoveOnOutsideId, true],
          [BulletId, { owner: shooter } satisfies Bullet],
          [
            ColliderId,
            {
              data: -1,
              bounds: {
                x: 0,
                y: 0,
                width: playerBulletTexture.height,
                height: playerBulletTexture.width,
              },
            } satisfies Collider,
          ],
        ]);
      }
    },
  );
};

const maxEnemey = 800;
// const maxEnemey = 300;
let currentEnemy = 0;
const timer = new Timer(0.03, { type: "infinite" });
const enemySpawnSystem: System = (context) => {
  timer.tick(context.deltaTime);
  if (timer.segmentFinished) {
    if (currentEnemy >= maxEnemey) {
      return;
    }
    currentEnemy += 1;
    const scale = 0.3;
    context.spawn("Enemy", [
      [
        TransformId,
        {
          position: {
            x: Math.random() * (context.stageWidth - 200) + 200,
            y: Math.random() * (context.stageHeight - 60) + 30,
          },
          rotation: 0,
          scale: {
            x: scale,
            y: scale,
          },
        } satisfies Transform,
      ],
      [
        SpriteId,
        { textureInfo: enemyTexture, width: 1, height: 1 } satisfies Sprite,
      ],
      [EnemyId, true],
      [
        BulletShooterId,
        {
          delayTimer: new Timer(0.3, { type: "once" }),
          offset: {
            x: 0,
            y: 0,
          },
        } satisfies BulletShooter,
      ],
      [
        ColliderId,
        {
          data: -1,
          bounds: {
            x: 0,
            y: 0,
            width: enemyTexture.width * scale,
            height: enemyTexture.height * scale,
          },
        } satisfies Collider,
      ],
    ]);
  }
};

const enemyShootSystem: System = (context) => {
  context.each(
    [read(TransformId), write(BulletShooterId), read(EnemyId)],
    (shooter, rawComponents) => {
      const [enemyTransform, bulletShooter] = rawComponents as [
        Transform,
        BulletShooter,
      ];
      bulletShooter.delayTimer.tick(context.deltaTime);
      if (!bulletShooter.delayTimer.finished) {
        return;
      }
      bulletShooter.delayTimer.reset();
      const scale = 0.3;
      context.spawn("Bullet", [
        [
          SpriteId,
          {
            textureInfo: playerBulletTexture,
            width: 1,
            height: 1,
          } satisfies Sprite,
        ],
        [
          TransformId,
          {
            position: {
              x: enemyTransform.position.x,
              y: enemyTransform.position.y,
            },
            rotation: toRadian(90),
            scale: {
              x: scale,
              y: scale,
            },
          } satisfies Transform,
        ],
        [
          VelocityId,
          {
            x: -500,
            y: 0,
          } satisfies Velocity,
        ],
        [RemoveOnOutsideId, true],
        [BulletId, { owner: shooter } satisfies Bullet],
        [
          ColliderId,
          {
            data: -1,
            bounds: {
              x: 0,
              y: 0,
              width: playerBulletTexture.height * scale,
              height: playerBulletTexture.width * scale,
            },
          } satisfies Collider,
        ],
      ]);
    },
  );
};

const velocitySystem: System = (context) => {
  context.each(
    [read(VelocityId), write(TransformId)],
    (_, rawComponents) => {
      const [velocity, transform] = rawComponents as [Velocity, Transform];
      transform.position.x += velocity.x * context.deltaTime;
      transform.position.y += velocity.y * context.deltaTime;
    },
  );
};

const clearOutsideObjectSystem: System = (context) => {
  context.each(
    [read(TransformId), read(SpriteId), read(RemoveOnOutsideId)],
    (entity, rawComponents) => {
      const [transform, sprite] = rawComponents as [Transform, Sprite];
      if (
        transform.position.x + sprite.textureInfo.width < 0 ||
        transform.position.x > context.stageWidth ||
        transform.position.y + sprite.textureInfo.height < 0 ||
        transform.position.y > context.stageHeight
      ) {
        context.despawn(entity);
      }
    },
  );
};

const hash2d = new SpatialHash();
engine.signals.anyEntityDespawned.register((data) => {
  if (engine.world.hasComponent(data.entity, ColliderId)) {
    hash2d.remove(
      engine.world.getComponent(data.entity, ColliderId) as Collider,
    );
  }
});

const updateSpatialHashSystem: System = (context) => {
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
const collisionSystemRequiredComponents = [read(ColliderId)];
const collisionSystem: System = (context) => {
  collidedEntityCache.clear();
  context.each(
    collisionSystemRequiredComponents,
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

const scoreSystem: System = (context) => {
  for (const event of context.readEvent("collision")) {
    assert(event instanceof CollisionEvent);
    assert(event.a !== event.b);
    let bulletEntity = event.a;
    let targetEntity = event.b;
    if (!context.hasComponent(bulletEntity, BulletId)) {
      bulletEntity = event.b;
      targetEntity = event.a;
    }

    // both are not bullet. continue.
    if (!context.hasComponent(bulletEntity, BulletId)) {
      continue;
    }

    const bullet = context.getComponent(
      bulletEntity,
      read(BulletId),
    ) as Bullet;

    const scoredPlayerComponent = context.getComponent(
      bullet.owner,
      write(PlayerId),
    ) as Player;
    if (
      bullet.owner !== targetEntity &&
      context.hasComponent(targetEntity, EnemyId) &&
      scoredPlayerComponent != null
    ) {
      console.log(context._world?.entities.entityToName.get(targetEntity));
      scoredPlayerComponent.score += 1;
      context.despawn(targetEntity);
    }
  }
};

// engine.world.addSystem("update", playerMoveSystem);
engine.world.addSystem("update", playerShootSystem);
engine.world.addSystem("update", enemySpawnSystem);
engine.world.addSystem("update", enemyShootSystem);
engine.world.addSystem("update", velocitySystem);
// engine.world.addSystem("update", updateColliderQuadtreeSystem);
engine.world.addSystem("update", updateSpatialHashSystem);
engine.world.addSystem("update", collisionSystem);
engine.world.addSystem("update", scoreSystem);
engine.world.addSystem("update", clearOutsideObjectSystem);

// For performance test
const fpsText = document.querySelector<HTMLSpanElement>("#fps")!;
const entitiesText = document.querySelector<HTMLSpanElement>("#entities")!;

engine.world.addSystem("update", (context) => {
  fpsText.textContent = `FPS: ${engine.averageFPS.toFixed(2)}`;
  entitiesText.textContent = `Entities: ${engine.world.entities.alives().length}`;
})

engine.run();
