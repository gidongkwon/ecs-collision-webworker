import { Engine } from './engine/engine';
import { clearOutsideObjectSystem } from './project/clear';
import { collisionSystem, createBoundsRenderSystem, hash2d, updateSpatialHashSystem } from './project/collision';
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

engine.world.addSystem("init", createPlayerSystem);
engine.world.addSystem("render", createBoundsRenderSystem(engine));
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

engine.world.addSystem("update", async () => {
  fpsText.textContent = `FPS: ${engine.averageFPS.toFixed(2)}`;
  entitiesText.textContent = `Entities: ${engine.world.entities.alives().length}`;
})

// Play/Pause
const playPauseButton = document.querySelector<HTMLButtonElement>("#play-pause-button")!;
playPauseButton.addEventListener("click", () => {
  if (engine.isRunning) {
    engine.pause();
    playPauseButton.textContent = "Play";
  } else {
    engine.run();
    playPauseButton.textContent = "Pause";
  }
});

// Next Frame
const nextFrameButton = document.querySelector<HTMLButtonElement>("#next-frame-button")!;
nextFrameButton.addEventListener("click", () => {
  engine.run();
  requestAnimationFrame(() => {
    engine.cleanup();
  });
});

// Resources
const resources = document.querySelector<HTMLDivElement>("#resources")!;
engine.project!.assets.forEach((asset) => {
  const container = document.createElement("div");
  const img = document.createElement("img");
  img.src = asset.path;
  container.appendChild(img);
  
  const sizeSpan = document.createElement("span");
  img.onload = () => {
    sizeSpan.textContent = `${img.width} x ${img.height} (Scale 1x)`;
  }
  container.appendChild(sizeSpan);

  resources.appendChild(container);
});


engine.world.callInitSystems();
engine.run();
