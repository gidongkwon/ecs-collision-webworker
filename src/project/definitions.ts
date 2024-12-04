import type { BoundsWithData } from "../engine/collections/spatial-hash";
import type { Entity } from "../engine/ecs/entity/entity";
import { ScatterEvent } from "../engine/ecs/event/event";
import type { Timer } from "../engine/timer/timer";

export interface Velocity {
  x: number;
  y: number;
}

export interface Player {
  score: number;
}
export interface Bullet {
  owner: Entity;
}
export interface BulletShooter {
  delayTimer: Timer;
  offset: {
    x: number;
    y: number;
  };
}
export interface Collider extends BoundsWithData<Entity> {}

export class CollisionEvent extends ScatterEvent {
  name = "collision";
  constructor(
    public a: Entity,
    public b: Entity,
  ) {
    super();
  }
}