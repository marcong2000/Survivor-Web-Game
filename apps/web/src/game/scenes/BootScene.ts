import Phaser from "phaser";
import { RUN_CONFIG_KEY } from "../config.js";
import type { RunConfig } from "../types.js";

/**
 * Generates simple placeholder textures (CC0 stand-ins — solid shapes) so the
 * MVP runs without external art, then hands off to the GameScene. Swap these
 * for a real sprite atlas in the polish phase.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this.makeCircleTexture("player", 16, 0x57b9ff);
    this.makeCircleTexture("enemy", 12, 0xe5534b);
    this.makeCircleTexture("boss", 36, 0xb267e6);
    this.makeCircleTexture("projectile", 5, 0xffe066);
    this.makeCircleTexture("orbital", 7, 0x9be15e);
    this.makeRingTexture("boomerang", 9, 0xffa53c);
    this.makeGemTexture("gem", 8, 0x4be8d0);

    const cfg = this.registry.get(RUN_CONFIG_KEY) as RunConfig;
    this.scene.start("Game", cfg);
  }

  private makeCircleTexture(key: string, radius: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(2, 0x000000, 0.35);
    g.strokeCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  private makeRingTexture(key: string, radius: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(4, color, 1);
    g.strokeCircle(radius, radius, radius - 2);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  private makeGemTexture(key: string, size: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(size, 0);
    g.lineTo(size * 2, size);
    g.lineTo(size, size * 2);
    g.lineTo(0, size);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, size * 2, size * 2);
    g.destroy();
  }
}
