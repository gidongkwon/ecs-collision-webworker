import type { Sprite } from "../engine/2d/sprite";
import type { Transform } from "../engine/2d/transform";
import { read, write } from "../engine/ecs/component/component-access-descriptor";
import type { System } from "../engine/ecs/system/system";
import { Timer } from "../engine/timer/timer";
import type { BulletShooter, Velocity, Bullet, Collider } from "./definitions";

export const createPlayerSystem: System = async (context) => {
  const playerTexture = context.assets.texture("player-ship")!;

  const TransformId = context.componentId("@scatter/Transform");
  const SpriteId = context.componentId("@scatter/Sprite");
  const PlayerId = context.componentId("@my/Player");
  const BulletShooterId = context.componentId("@my/BulletShooter");
  const ColliderId = context.componentId("@my/Collider");

  const scale = 0.5;
      
  context.spawn("Player", [
    [
      TransformId,
      {
        position: {
          x: 100,
          y: 100,
        },
        rotation: 0,
        scale: {
          x: scale,
          y: scale,
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
          width: playerTexture.width * scale,
          height: playerTexture.height * scale,
        },
      },
    ],
  ]);
}

export const playerMoveSystem: System = async (context) => {
  context.each([write(0), read(1), read(3)], (_, [rawTransform]) => {
    const transform = rawTransform as Transform;
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
  });
}

export const playerShootSystem: System = async (context) => {
  const VelocityId = context.componentId("@my/Velocity");
  const TransformId = context.componentId("@scatter/Transform");
  const SpriteId = context.componentId("@scatter/Sprite");
  const PlayerId = context.componentId("@my/Player");
  const BulletShooterId = context.componentId("@my/BulletShooter");
  const ColliderId = context.componentId("@my/Collider");
  const BulletId = context.componentId("@my/Bullet");
  const RemoveOnOutsideId = context.componentId("@my/RemoveOnOutside");

  const playerBulletTexture = context.assets.texture("player-bullet")!;

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
                x: playerTransform.position.x + bulletShooter.offset.x,
                y: playerTransform.position.y + bulletShooter.offset.y,
              },
              rotation: 0,
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
              collidedThisFrame: false,
              bounds: {
                x: 0,
                y: 0,
                width: playerBulletTexture.width,
                height: playerBulletTexture.height,
              },
            } satisfies Collider,
          ],
        ]);
      }
    },
  );
};