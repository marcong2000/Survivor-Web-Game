import Phaser from "phaser";
import type { PlayerStats, WeaponDef, WeaponId, WeaponStats } from "@survivor/shared";
import { CHARACTERS } from "../../data/characters.js";
import { MAPS } from "../../data/maps.js";
import { applyEvolution, WEAPONS, weaponStatsAtLevel } from "../../data/weapons.js";
import { rollUpgrades, statBoostAmount, type UpgradeOption } from "../../data/upgrades.js";
import { gameBus } from "../GameBus.js";
import { GAME_HEIGHT, GAME_WIDTH, WORLD_SIZE } from "../config.js";
import type { RunConfig } from "../types.js";

type Sprite = Phaser.Physics.Arcade.Sprite;

const PLAYER_HURT_COOLDOWN = 0.5; // seconds of i-frames after taking a hit
const HUD_INTERVAL = 0.1; // seconds between HUD pushes to React
const GEM_ATTRACT_SPEED = 340;

export class GameScene extends Phaser.Scene {
  private cfg!: RunConfig;

  private player!: Sprite;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;

  private stats!: PlayerStats;
  private hp = 0;
  private maxHp = 0;

  private ownedWeapons = new Map<WeaponId, number>();
  private weaponCooldowns = new Map<WeaponId, number>();
  private evolvedWeapons = new Set<WeaponId>();

  private enemyId = 0;
  private auraGfx?: Phaser.GameObjects.Arc;
  private auraFlash = 0;

  private xp = 0;
  private level = 1;
  private xpToNext = 8;
  private kills = 0;
  private elapsed = 0;

  private running = false;
  private spawnAcc = 0;
  private hudAcc = 0;
  private hurtCd = 0;
  private bossSpawned = false;

  private pendingOptions: UpgradeOption[] = [];
  private lastMoveDir = new Phaser.Math.Vector2(0, -1);

  constructor() {
    super("Game");
  }

  create(cfg: RunConfig) {
    this.cfg = cfg;
    this.resetState();

    const character = CHARACTERS[cfg.characterId] ?? Object.values(CHARACTERS)[0];

    if (cfg.gm) {
      // GM/test mode: start with the hand-picked loadout instead of defaults.
      this.stats = { ...cfg.gm.stats };
      this.level = Math.max(1, Math.floor(cfg.gm.startLevel));
      this.xpToNext = Math.floor(8 + (this.level - 1) * 5 + Math.pow(this.level, 1.3));
      const picks = cfg.gm.weapons.filter((w) => WEAPONS[w.weaponId]);
      if (picks.length === 0) picks.push({ weaponId: character.startWeaponId, level: 1 });
      for (const w of picks) {
        const def = WEAPONS[w.weaponId];
        this.ownedWeapons.set(w.weaponId, Phaser.Math.Clamp(Math.floor(w.level), 1, def.maxLevel));
        this.weaponCooldowns.set(w.weaponId, 0);
      }
    } else {
      this.stats = { ...character.startStats };
      this.ownedWeapons.set(character.startWeaponId, 1);
      this.weaponCooldowns.set(character.startWeaponId, 0);
    }

    this.maxHp = this.stats.maxHp;
    this.hp = this.maxHp;

    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.drawGrid();

    this.player = this.physics.add.sprite(WORLD_SIZE / 2, WORLD_SIZE / 2, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    const kb = this.input.keyboard!;
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.gems = this.physics.add.group();

    this.physics.add.overlap(this.projectiles, this.enemies, this.onProjectileHitEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyTouchPlayer, undefined, this);

    gameBus.onTyped("choose-upgrade", this.handleChooseUpgrade, this);
    gameBus.onTyped("quit-run", this.handleQuit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.running = true;
    this.emitHud();
  }

  private resetState() {
    this.hp = 0;
    this.maxHp = 0;
    this.ownedWeapons.clear();
    this.weaponCooldowns.clear();
    this.evolvedWeapons.clear();
    this.enemyId = 0;
    this.auraFlash = 0;
    this.auraGfx = undefined;
    this.xp = 0;
    this.level = 1;
    this.xpToNext = 8;
    this.kills = 0;
    this.elapsed = 0;
    this.spawnAcc = 0;
    this.hudAcc = 0;
    this.hurtCd = 0;
    this.bossSpawned = false;
    this.pendingOptions = [];
    this.lastMoveDir.set(0, -1);
  }

  update(_time: number, deltaMs: number) {
    if (!this.running) return;
    const dt = deltaMs / 1000;
    this.elapsed += dt;

    this.handleMovement();
    this.handleWeapons(dt);
    this.updateEnemies();
    this.updateProjectiles(dt);
    this.collectGems(dt);

    if (this.hurtCd > 0) this.hurtCd -= dt;

    this.maybeSpawnBoss();
    this.spawnEnemies(dt);

    this.hudAcc += dt;
    if (this.hudAcc >= HUD_INTERVAL) {
      this.hudAcc = 0;
      this.emitHud();
    }
  }

  // --- Movement (WASD) -----------------------------------------------------

  private handleMovement() {
    const dir = new Phaser.Math.Vector2(0, 0);
    if (this.keyA.isDown) dir.x -= 1;
    if (this.keyD.isDown) dir.x += 1;
    if (this.keyW.isDown) dir.y -= 1;
    if (this.keyS.isDown) dir.y += 1;

    if (dir.lengthSq() > 0) {
      dir.normalize();
      this.lastMoveDir.copy(dir);
    }
    this.player.setVelocity(dir.x * this.stats.moveSpeed, dir.y * this.stats.moveSpeed);
  }

  // --- Weapons & aiming ----------------------------------------------------

  private handleWeapons(dt: number) {
    if (this.auraFlash > 0) this.auraFlash -= dt;
    let auraRadius = 0;

    for (const [weaponId, level] of this.ownedWeapons) {
      const def = WEAPONS[weaponId];
      if (!def) continue;
      let stats = weaponStatsAtLevel(def, level);
      const evolved = this.evolvedWeapons.has(weaponId);
      if (evolved) stats = applyEvolution(stats, def);

      if (def.behavior === "aura") auraRadius = Math.max(auraRadius, stats.range);

      const remaining = (this.weaponCooldowns.get(weaponId) ?? 0) - dt;
      if (remaining > 0) {
        this.weaponCooldowns.set(weaponId, remaining);
        continue;
      }
      this.weaponCooldowns.set(weaponId, stats.cooldown);

      switch (def.behavior) {
        case "projectile":
          this.fireProjectiles(weaponId, stats);
          break;
        case "boomerang":
          this.fireBoomerang(weaponId, stats, evolved, def);
          break;
        case "aura":
          this.auraTick(stats);
          break;
      }
    }

    this.updateAuraVisual(auraRadius);
  }

  /** Direction to fire, governed by the persistent aim mode. */
  private getAimVector(range: number): Phaser.Math.Vector2 | null {
    if (this.cfg.aimMode === "manual") {
      const p = this.input.activePointer;
      const dir = new Phaser.Math.Vector2(p.worldX - this.player.x, p.worldY - this.player.y);
      if (dir.lengthSq() < 1) return this.lastMoveDir.clone();
      return dir.normalize();
    }
    // assisted: target the nearest enemy (preferring those in range).
    const target = this.findNearestEnemy(range) ?? this.findNearestEnemy(Infinity);
    if (!target) return null; // nothing to shoot at; hold fire
    return new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y).normalize();
  }

  private findNearestEnemy(maxDist: number, exclude?: ReadonlySet<number>): Sprite | null {
    let best: Sprite | null = null;
    let bestD = maxDist * maxDist;
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Sprite;
      if (!e.active) continue;
      if (exclude && exclude.has(e.getData("eid") as number)) continue;
      const d = Phaser.Math.Distance.Squared(this.player.x, this.player.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private spawnProjectile(texture: string): Sprite | null {
    const proj = this.projectiles.get(this.player.x, this.player.y, texture) as Sprite | null;
    if (!proj) return null;
    proj.setActive(true).setVisible(true);
    proj.setTexture(texture);
    proj.setDepth(8);
    proj.setRotation(0);
    const body = proj.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.reset(this.player.x, this.player.y);
    return proj;
  }

  private fireProjectiles(weaponId: WeaponId, stats: WeaponStats) {
    const aim = this.getAimVector(stats.range);
    if (!aim) return;
    const baseAngle = aim.angle();
    const spread = Phaser.Math.DegToRad(18);
    const speed = Math.max(1, stats.projectileSpeed);
    for (let i = 0; i < stats.count; i++) {
      const offset = stats.count > 1 ? (i - (stats.count - 1) / 2) * spread : 0;
      const proj = this.spawnProjectile("projectile");
      if (!proj) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      this.physics.velocityFromRotation(baseAngle + offset, speed, body.velocity);
      proj.setData("behavior", "projectile");
      proj.setData("damage", stats.damage * this.stats.attack);
      proj.setData("pierceLeft", Math.max(1, Math.round(stats.pierce)));
      proj.setData("hit", new Set<number>());
      proj.setData("ttl", stats.range / speed);
      proj.setData("weapon", weaponId);
    }
  }

  private fireBoomerang(weaponId: WeaponId, stats: WeaponStats, evolved: boolean, def: WeaponDef) {
    const aim = this.getAimVector(stats.range);
    if (!aim) return;
    const baseAngle = aim.angle();
    const spread = Phaser.Math.DegToRad(20);
    const speed = Math.max(1, stats.projectileSpeed);
    const ricochet = evolved && !!def.evolution?.ricochetBounces;
    const maxBounces = def.evolution?.ricochetBounces ?? 5;
    for (let i = 0; i < stats.count; i++) {
      const offset = stats.count > 1 ? (i - (stats.count - 1) / 2) * spread : 0;
      const proj = this.spawnProjectile("boomerang");
      if (!proj) continue;
      const body = proj.body as Phaser.Physics.Arcade.Body;
      this.physics.velocityFromRotation(baseAngle + offset, speed, body.velocity);
      proj.setData("behavior", "boomerang");
      proj.setData("damage", stats.damage * this.stats.attack);
      proj.setData("hit", new Set<number>());
      proj.setData("weapon", weaponId);
      proj.setData("speed", speed);
      proj.setData("range", stats.range);
      proj.setData("ox", this.player.x);
      proj.setData("oy", this.player.y);
      proj.setData("phase", "out");
      proj.setData("ricochet", ricochet);
      proj.setData("maxBounces", maxBounces);
      proj.setData("life", 8); // safety lifetime so a boomerang can't leak
    }
  }

  private auraTick(stats: WeaponStats) {
    const dmg = stats.damage * this.stats.attack;
    const r2 = stats.range * stats.range;
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Sprite;
      if (!e.active) continue;
      if (Phaser.Math.Distance.Squared(this.player.x, this.player.y, e.x, e.y) <= r2) {
        this.damageEnemy(e, dmg);
      }
    }
    this.auraFlash = 0.12;
  }

  private updateAuraVisual(radius: number) {
    if (radius <= 0) {
      this.auraGfx?.setVisible(false);
      return;
    }
    if (!this.auraGfx) {
      this.auraGfx = this.add.circle(this.player.x, this.player.y, radius, 0x57b9ff, 0.1);
      this.auraGfx.setDepth(2);
    }
    this.auraGfx.setVisible(true);
    this.auraGfx.setPosition(this.player.x, this.player.y);
    this.auraGfx.setRadius(radius);
    this.auraGfx.setFillStyle(0x57b9ff, this.auraFlash > 0 ? 0.28 : 0.1);
  }

  private updateProjectiles(dt: number) {
    for (const obj of this.projectiles.getChildren()) {
      const proj = obj as Sprite;
      if (!proj.active) continue;
      if ((proj.getData("behavior") as string) === "boomerang") {
        this.updateBoomerang(proj, dt);
        continue;
      }
      const ttl = (proj.getData("ttl") as number) - dt;
      if (ttl <= 0) {
        this.despawn(proj);
      } else {
        proj.setData("ttl", ttl);
      }
    }
  }

  private updateBoomerang(proj: Sprite, dt: number) {
    proj.rotation += 12 * dt; // spin for visual flair
    const life = (proj.getData("life") as number) - dt;
    if (life <= 0) {
      this.despawn(proj);
      return;
    }
    proj.setData("life", life);

    const body = proj.body as Phaser.Physics.Arcade.Body;
    const speed = proj.getData("speed") as number;
    const hit = proj.getData("hit") as Set<number>;

    if (proj.getData("ricochet") as boolean) {
      // Evolved: chain to the nearest not-yet-hit enemy, up to maxBounces.
      if (hit.size >= (proj.getData("maxBounces") as number)) {
        this.despawn(proj);
        return;
      }
      const target = this.findNearestEnemy(Infinity, hit);
      if (!target) {
        this.despawn(proj);
        return;
      }
      const angle = Phaser.Math.Angle.Between(proj.x, proj.y, target.x, target.y);
      this.physics.velocityFromRotation(angle, speed, body.velocity);
      return;
    }

    // Normal boomerang: fly out to range, then home back to the player.
    if ((proj.getData("phase") as string) === "out") {
      const ox = proj.getData("ox") as number;
      const oy = proj.getData("oy") as number;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, ox, oy) >= (proj.getData("range") as number)) {
        proj.setData("phase", "back");
        hit.clear(); // can strike enemies again on the way back
      }
    } else {
      const angle = Phaser.Math.Angle.Between(proj.x, proj.y, this.player.x, this.player.y);
      this.physics.velocityFromRotation(angle, speed, body.velocity);
      if (Phaser.Math.Distance.Between(proj.x, proj.y, this.player.x, this.player.y) <= 18) {
        this.despawn(proj);
      }
    }
  }

  // --- Enemies -------------------------------------------------------------

  private updateEnemies() {
    for (const obj of this.enemies.getChildren()) {
      const e = obj as Sprite;
      if (!e.active) continue;
      const speed = e.getData("speed") as number;
      const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
      const body = e.body as Phaser.Physics.Arcade.Body;
      this.physics.velocityFromRotation(angle, speed, body.velocity);
    }
  }

  private spawnEnemies(dt: number) {
    const minutes = this.elapsed / 60;
    const mapDef = MAPS[this.cfg.mapId] ?? Object.values(MAPS)[0];
    const rate = mapDef.baseSpawnRate * (1 + minutes * 0.8);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      this.spawnEnemy(false);
    }
  }

  private spawnEnemy(isBoss: boolean) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(GAME_WIDTH, GAME_HEIGHT) / 2 + 80;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 20, WORLD_SIZE - 20);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 20, WORLD_SIZE - 20);

    const e = this.enemies.get(x, y, isBoss ? "boss" : "enemy") as Sprite | null;
    if (!e) return;
    e.setActive(true).setVisible(true);
    e.setDepth(5);
    const ebody = e.body as Phaser.Physics.Arcade.Body;
    ebody.enable = true;
    ebody.reset(x, y);
    e.setData("eid", ++this.enemyId);

    const minutes = this.elapsed / 60;
    if (isBoss) {
      e.setData("hp", 600 + minutes * 200);
      e.setData("speed", 70);
      e.setData("damage", 25);
      e.setData("xp", 30);
      e.setData("boss", true);
    } else {
      e.setData("hp", 12 + minutes * 6);
      e.setData("speed", Phaser.Math.Between(60, 95));
      e.setData("damage", 8);
      e.setData("xp", 1);
      e.setData("boss", false);
    }
  }

  private maybeSpawnBoss() {
    if (this.bossSpawned) return;
    const mapDef = MAPS[this.cfg.mapId] ?? Object.values(MAPS)[0];
    if (this.elapsed >= mapDef.bossSpawnTime) {
      this.bossSpawned = true;
      this.spawnEnemy(true);
    }
  }

  // --- Collisions ----------------------------------------------------------

  private onProjectileHitEnemy: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (projObj, enemyObj) => {
    const proj = projObj as Sprite;
    const enemy = enemyObj as Sprite;
    if (!proj.active || !enemy.active) return;

    // Each projectile only damages a given enemy once (per leg, for boomerangs).
    const hit = proj.getData("hit") as Set<number> | undefined;
    const eid = enemy.getData("eid") as number;
    if (hit) {
      if (hit.has(eid)) return;
      hit.add(eid);
    }

    this.damageEnemy(enemy, proj.getData("damage") as number);

    // Straight projectiles pierce a limited number of enemies; boomerangs/auras
    // manage their own lifetime, so don't despawn them on hit.
    if ((proj.getData("behavior") as string) === "projectile") {
      const pierceLeft = (proj.getData("pierceLeft") as number) - 1;
      if (pierceLeft <= 0) this.despawn(proj);
      else proj.setData("pierceLeft", pierceLeft);
    }
  };

  private damageEnemy(enemy: Sprite, damage: number) {
    const hp = (enemy.getData("hp") as number) - damage;
    if (hp <= 0) {
      this.killEnemy(enemy);
    } else {
      enemy.setData("hp", hp);
      this.flash(enemy);
    }
  }

  private onEnemyTouchPlayer: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_playerObj, enemyObj) => {
    if (this.hurtCd > 0) return;
    const enemy = enemyObj as Sprite;
    if (!enemy.active) return;
    this.hurtCd = PLAYER_HURT_COOLDOWN;
    this.hp -= enemy.getData("damage") as number;
    this.flash(this.player);
    if (this.hp <= 0) {
      this.hp = 0;
      this.endRun(false);
    }
  };

  private killEnemy(enemy: Sprite) {
    const isBoss = enemy.getData("boss") as boolean;
    const xpValue = enemy.getData("xp") as number;
    this.dropGem(enemy.x, enemy.y, xpValue);
    this.kills += 1;
    this.despawn(enemy);

    if (isBoss && this.cfg.mode === "normal") {
      this.endRun(true);
    }
  }

  // --- XP gems (proximity pickup) -----------------------------------------

  private dropGem(x: number, y: number, value: number) {
    const gem = this.gems.get(x, y, "gem") as Sprite | null;
    if (!gem) return;
    gem.setActive(true).setVisible(true);
    gem.setDepth(6);
    const gbody = gem.body as Phaser.Physics.Arcade.Body;
    gbody.enable = true;
    gbody.reset(x, y);
    gem.setVelocity(0, 0);
    gem.setData("xp", value);
  }

  /**
   * Gems are only picked up when the player comes within `pickupRadius` of
   * where the enemy died — they then home in and are collected on contact.
   */
  private collectGems(dt: number) {
    const radius = this.stats.pickupRadius;
    for (const obj of this.gems.getChildren()) {
      const gem = obj as Sprite;
      if (!gem.active) continue;
      const dist = Phaser.Math.Distance.Between(gem.x, gem.y, this.player.x, this.player.y);
      if (dist <= 14) {
        this.gainXp(gem.getData("xp") as number);
        this.despawn(gem);
      } else if (dist <= radius) {
        const angle = Phaser.Math.Angle.Between(gem.x, gem.y, this.player.x, this.player.y);
        gem.x += Math.cos(angle) * GEM_ATTRACT_SPEED * dt;
        gem.y += Math.sin(angle) * GEM_ATTRACT_SPEED * dt;
      }
    }
  }

  private gainXp(amount: number) {
    this.xp += amount * this.stats.xpGain;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.floor(8 + (this.level - 1) * 5 + Math.pow(this.level, 1.3));
      this.triggerLevelUp();
    }
  }

  // --- Level up ------------------------------------------------------------

  private triggerLevelUp() {
    this.running = false;
    this.physics.pause();
    this.hp = this.maxHp; // leveling up fully heals the player
    this.pendingOptions = rollUpgrades(this.ownedWeapons, this.evolvedWeapons, this.stats.luck, 3);
    this.emitHud();
    gameBus.emitTyped("levelup", { level: this.level, options: this.pendingOptions });
  }

  private handleChooseUpgrade = (optionId: string) => {
    const option = this.pendingOptions.find((o) => o.id === optionId) ?? this.pendingOptions[0];
    if (option) this.applyUpgrade(option);
    this.pendingOptions = [];

    // A single XP overflow can stack multiple level-ups; surface the next one.
    if (this.xp >= this.xpToNext) {
      this.level += 1;
      this.xp -= this.xpToNext;
      this.xpToNext = Math.floor(8 + (this.level - 1) * 5 + Math.pow(this.level, 1.3));
      this.triggerLevelUp();
      return;
    }

    this.physics.resume();
    this.running = true;
    this.emitHud();
  };

  private applyUpgrade(option: UpgradeOption) {
    switch (option.kind) {
      case "new-weapon":
        this.ownedWeapons.set(option.weaponId, option.toLevel);
        this.weaponCooldowns.set(option.weaponId, 0);
        break;
      case "level-weapon":
        this.ownedWeapons.set(option.weaponId, option.toLevel);
        break;
      case "evolve-weapon":
        this.evolvedWeapons.add(option.weaponId);
        break;
      case "stat": {
        const delta = statBoostAmount(option.stat, option.rarity, this.stats[option.stat]);
        if (option.stat === "maxHp") {
          this.maxHp += delta;
          this.stats.maxHp += delta;
          this.hp = Math.min(this.maxHp, this.hp + delta);
        } else {
          this.stats[option.stat] += delta;
        }
        break;
      }
    }
  }

  // --- Run end -------------------------------------------------------------

  private endRun(victory: boolean) {
    this.running = false;
    this.physics.pause();

    const score = this.kills * 10 + Math.floor(this.elapsed) + this.level * 25;
    const goldEarned = Math.floor(score / 5);
    const runePointsEarned = Math.floor(this.elapsed / 120) + (victory ? 1 : 0);

    gameBus.emitTyped("runend", {
      victory,
      kills: this.kills,
      time: Math.floor(this.elapsed),
      level: this.level,
      score,
      goldEarned,
      runePointsEarned,
    });
  }

  private handleQuit = () => {
    if (!this.running && this.pendingOptions.length === 0) return;
    this.endRun(false);
  };

  // --- Helpers -------------------------------------------------------------

  private despawn(sprite: Sprite) {
    sprite.setActive(false).setVisible(false);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.stop();
    body.enable = false; // re-enabled by spawn helpers when the sprite is reused
  }

  private flash(sprite: Sprite) {
    sprite.setTintFill(0xffffff);
    this.time.delayedCall(60, () => sprite.clearTint());
  }

  private drawGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x2c3e2f, 1);
    const step = 80;
    for (let x = 0; x <= WORLD_SIZE; x += step) {
      g.lineBetween(x, 0, x, WORLD_SIZE);
    }
    for (let y = 0; y <= WORLD_SIZE; y += step) {
      g.lineBetween(0, y, WORLD_SIZE, y);
    }
    g.setDepth(0);
  }

  private emitHud() {
    gameBus.emitTyped("hud", {
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: Math.round(this.maxHp),
      level: this.level,
      xp: Math.floor(this.xp),
      xpToNext: this.xpToNext,
      kills: this.kills,
      time: Math.floor(this.elapsed),
    });
  }

  private cleanup() {
    gameBus.offTyped("choose-upgrade", this.handleChooseUpgrade, this);
    gameBus.offTyped("quit-run", this.handleQuit, this);
    this.auraGfx?.destroy();
    this.auraGfx = undefined;
  }
}
