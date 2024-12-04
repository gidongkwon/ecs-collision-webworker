import type { Transform } from "../engine/2d/transform";
import { read, write } from "../engine/ecs/component/component-access-descriptor";
import type { System } from "../engine/ecs/system/system";
import type { Velocity } from "./definitions";

export const velocitySystem: System = (context) => {
  const VelocityId = context.componentId("@my/Velocity");
  const TransformId = context.componentId("@scatter/Transform");
  
  context.each(
    [read(VelocityId), write(TransformId)],
    (_, rawComponents) => {
      const [velocity, transform] = rawComponents as [Velocity, Transform];
      transform.position.x += velocity.x * context.deltaTime;
      transform.position.y += velocity.y * context.deltaTime;
    },
  );
};