import type { Sprite } from "../engine/2d/sprite";
import type { Transform } from "../engine/2d/transform";
import { read } from "../engine/ecs/component/component-access-descriptor";
import type { System } from "../engine/ecs/system/system";

export const clearOutsideObjectSystem: System = (context) => {
  const TransformId = context.componentId("@scatter/Transform");
  const SpriteId = context.componentId("@scatter/Sprite");
  const RemoveOnOutsideId = context.componentId("@my/RemoveOnOutside");

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