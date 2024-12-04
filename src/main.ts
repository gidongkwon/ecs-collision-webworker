import { Engine } from './engine/engine';
import { clearOutsideObjectSystem } from './project/clear';
import { collisionSystem, hash2d, updateSpatialHashSystem } from './project/collision';
import type { Collider } from './project/definitions';
import { enemyShootSystem, enemySpawnSystem } from './project/enemy';
import { createPlayerSystem, playerMoveSystem, playerShootSystem } from './project/player';
import { velocitySystem } from './project/velocity';
import './style.css'

const gameCanvas = document.querySelector<HTMLCanvasElement>('#game')!
const engine = new Engine(gameCanvas);

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
  systems: [],
  components: [],
  scenes: [
    {
      name: "Shooter Test",
      entities: [],
      scripts: {
        init: [],
        update: [],
        render: [],
      },
    },
  ],
});

engine.world.registerComponent("@my/Velocity");
engine.world.registerComponent("@my/Player");
engine.world.registerComponent("@my/Enemy");
engine.world.registerComponent("@my/Bullet");
engine.world.registerComponent("@my/BulletShooter");
engine.world.registerComponent(
  "@my/RemoveOnOutside",
);
const ColliderId = engine.world.registerComponent("@my/Collider");
engine.world.registerEvent("collision");

engine.loadScene(engine.project!.scenes[0], engine.project!.systems);

engine.signals.anyEntityDespawned.register((data) => {
  if (engine.world.hasComponent(data.entity, ColliderId)) {
    hash2d.remove(
      engine.world.getComponent(data.entity, ColliderId) as Collider,
    );
  }
});

// const scoreSystem: System = (context) => {
//   for (const event of context.readEvent("collision")) {
//     assert(event instanceof CollisionEvent);
//     assert(event.a !== event.b);
//     let bulletEntity = event.a;
//     let targetEntity = event.b;
//     if (!context.hasComponent(bulletEntity, BulletId)) {
//       bulletEntity = event.b;
//       targetEntity = event.a;
//     }

//     // both are not bullet. continue.
//     if (!context.hasComponent(bulletEntity, BulletId)) {
//       continue;
//     }

//     const bullet = context.getComponent(
//       bulletEntity,
//       read(BulletId),
//     ) as Bullet;

//     const scoredPlayerComponent = context.getComponent(
//       bullet.owner,
//       write(PlayerId),
//     ) as Player;
//     if (
//       bullet.owner !== targetEntity &&
//       context.hasComponent(targetEntity, EnemyId) &&
//       scoredPlayerComponent != null
//     ) {
//       console.log(context._world?.entities.entityToName.get(targetEntity));
//       scoredPlayerComponent.score += 1;
//       context.despawn(targetEntity);
//     }
//   }
// };

engine.world.addSystem("init", createPlayerSystem);
engine.world.addSystem("update", playerMoveSystem);
engine.world.addSystem("update", playerShootSystem);
engine.world.addSystem("update", enemySpawnSystem);
engine.world.addSystem("update", enemyShootSystem);
engine.world.addSystem("update", velocitySystem);
engine.world.addSystem("update", updateSpatialHashSystem);
engine.world.addSystem("update", collisionSystem);
engine.world.addSystem("update", clearOutsideObjectSystem);

// For performance test
const fpsText = document.querySelector<HTMLSpanElement>("#fps")!;
const entitiesText = document.querySelector<HTMLSpanElement>("#entities")!;

engine.world.addSystem("update", () => {
  fpsText.textContent = `FPS: ${engine.averageFPS.toFixed(2)}`;
  entitiesText.textContent = `Entities: ${engine.world.entities.alives().length}`;
})

engine.world.callInitSystems();
engine.run();
