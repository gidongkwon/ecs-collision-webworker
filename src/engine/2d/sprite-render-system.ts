import type { ComponentId } from "../ecs/component/component";
import { read } from "../ecs/component/component-access-descriptor";
import type { SystemContext } from "../ecs/system/system-context";
import type { Engine } from "../engine";
import { drawImage } from "./draw-image";
import type { Sprite } from "./sprite";
import type { Transform } from "./transform";

export function createSpriteRenderSystem(
  componentIds: ComponentId[],
  engine: Engine,
) {
  return async (context: SystemContext) => {
    context.each(
      componentIds.map((id) => read(id)),
      (_, [rawTransform, rawSprite]) => {
        const transform = rawTransform as unknown as Transform;
        const sprite = rawSprite as unknown as Sprite;

        const dstX = transform.position.x;
        const dstY = transform.position.y;
        const dstWidth = sprite.textureInfo.width * transform.scale.x;
        const dstHeight = sprite.textureInfo.height * transform.scale.y;
        const dstRotation = transform.rotation;
        const srcX = 0;
        const srcY = 0;
        const srcWidth = sprite.textureInfo.width * sprite.width;
        const srcHeight = sprite.textureInfo.height * sprite.height;

        drawImage(
          engine.gl,
          engine.programInfo,
          sprite.textureInfo.texture,
          sprite.textureInfo.width,
          sprite.textureInfo.height,
          dstX,
          dstY,
          dstWidth,
          dstHeight,
          dstRotation,
          srcX,
          srcY,
          srcWidth,
          srcHeight,
        );
      },
    );
  };
}
