import { toRadian } from "gl-matrix/common";
import type { Sprite } from "../engine/2d/sprite";
import type { Transform } from "../engine/2d/transform";
import { read, write } from "../engine/ecs/component/component-access-descriptor";
import type { System } from "../engine/ecs/system/system";
import { Timer } from "../engine/timer/timer";
import type { BulletShooter, Collider, Velocity, Bullet } from "./definitions";

const maxEnemey = 10;
// const maxEnemey = 300;
let currentEnemy = 0;
const timer = new Timer(0.03, { type: "infinite" });

export const enemySpawnSystem: System = (context) => {
  const enemyTexture = context.assets.texture("enemy-ship")!;

  const TransformId = context.componentId("@scatter/Transform");
  const SpriteId = context.componentId("@scatter/Sprite");
  const BulletShooterId = context.componentId("@my/BulletShooter");
  const ColliderId = context.componentId("@my/Collider");
  const EnemyId = context.componentId("@my/Enemy");

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
            x: -enemyTexture.width * scale,
            y: enemyTexture.height * scale / 2,
          },
        } satisfies BulletShooter,
      ],
      [
        ColliderId,
        {
          data: -1,
          collidedThisFrame: false,
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

export const enemyShootSystem: System = (context) => {
  const playerBulletTexture = context.assets.texture("player-bullet")!;

  const VelocityId = context.componentId("@my/Velocity");
  const BulletId = context.componentId("@my/Bullet");
  const RemoveOnOutsideId = context.componentId("@my/RemoveOnOutside");
  const TransformId = context.componentId("@scatter/Transform");
  const SpriteId = context.componentId("@scatter/Sprite");
  const BulletShooterId = context.componentId("@my/BulletShooter");
  const ColliderId = context.componentId("@my/Collider");
  const EnemyId = context.componentId("@my/Enemy");

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
              x: enemyTransform.position.x + bulletShooter.offset.x,
              y: enemyTransform.position.y + bulletShooter.offset.y,
            },
            rotation: 0,
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
            collidedThisFrame: false,
            bounds: {
              x: 0,
              y: 0,
              width: playerBulletTexture.width * scale,
              height: playerBulletTexture.height * scale,
            },
          } satisfies Collider,
        ],
      ]);
    },
  );
};