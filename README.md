# DArk : Echo Sector
## Overview
**DArk : Echo Sector** is a fully playable top-down tactical combat game .

Set beneath a fractured megacity, players enter the abandoned DArk combat simulation facility where rogue defense units, adaptive AI, and dynamically changing rooms create an increasingly dangerous battlefield.

The project intentionally avoids external game engines such as Phaser, PixiJS, Three.js, Babylon.js, or Unity. Every gameplay system is implemented manually, including rendering, physics, collision detection, AI state machines, visibility calculations, procedural generation, and save management.

## Features

### Core Combat

* Real-time top-down combat
* Manual aiming and shooting
* Multiple weapon types
* Health and damage systems
* Enemy projectiles
* Kill streaks and combo scoring

### Bullet Ricochet System

Projectiles reflect realistically from walls using angle-of-incidence calculations.

Features:

* Single bounce
* Multi-bounce upgrades
* Corner-clearing tactics
* Ricochet kill bonuses

## Room System

The world consists of interconnected combat chambers.

Each room can contain:

* Enemy bots
* Obstacles
* Loot crates
* Currency drops
* Hazard zones
* Powerup stations
* Locked doors
* Safe rooms

Room transitions occur seamlessly through corridors and doors.

## Vision System

### Player Visibility

Real-time radial visibility is calculated every frame.

Features:

* Raycast-based line-of-sight
* Shadow casting
* Wall obstruction
* Dynamic lighting support
* Room-bound visibility limits

### Enemy Detection

Enemies use independent visibility systems:

* Vision cones
* Patrol awareness
* Sound detection
* Proximity alerts
* Alert propagation

## Enemy AI

Every enemy runs a dedicated state machine.

### States

Idle
→ Patrol
→ Alert
→ Chase
→ Attack
→ Death

### Enemy Types

#### Patrol Bot

* Standard enemy
* Patrol routes
* Medium health

#### Turret

* Stationary
* High fire rate
* Long range

#### Sniper

* Extreme range
* High damage
* Slow reload

#### Dash Unit

* Burst movement
* Melee specialist

#### Cloaked Unit

* Invisible at long range
* Reveals nearby

#### Explosive Bot

* Self-destructs
* Area damage on death

#### Adaptive AI

Learns player patterns.

Can:

* Change routes
* Switch targets
* Counter repetitive strategies

## Marketplace System

Currency is earned through:

* Enemy kills
* Room clears
* Quests
* Loot drops

Marketplace upgrades include:

### Weapon Upgrades

* Damage boost
* Fire rate boost
* Bounce count increase
* Magazine size increase

### Player Upgrades

* Shield
* Speed boost
* Health restoration
* Damage multiplier

### Special Modes

* Spread shot
* Piercing bullets
* Explosive rounds
* Rapid fire

## Powerups

Temporary abilities available during a run.

### Available Powerups

* Invisibility
* Invincibility Shield
* Speed Burst
* Damage Amplifier
* Regeneration
* Time Slow

## Procedural Generation

Each run generates:

* Room layouts
* Wall positions
* Enemy placement
* Loot placement
* Hazard zones
* Door connections

This ensures no two runs are identical.

## Infinite Sector Mode

Advanced game mode featuring:

* Infinite room generation
* Chunk-based world expansion
* Endless difficulty scaling
* Survival leaderboard

## Biomes

### Blackout Zone

* Reduced player visibility

### Toxic Sector

* Constant health drain

### Fog Chamber

* Reduced visibility for all units

### Speed Sector

* Modified movement speed

---

## Quest System

Dynamic objectives generated during gameplay.

Examples:

* Eliminate 10 enemies
* Finish a room unharmed
* Achieve 3 ricochet kills
* Complete room under 30 seconds
* Survive 5 rooms

Rewards:

* Currency
* Rare upgrades
* Temporary buffs

## HUD

Displays:

* Health
* Currency
* Score
* Active powerups
* Room number
* Timer
* Weapon information
* Objective progress

## Audio

Includes:

* Weapon firing sounds
* Enemy death sounds
* Player damage sounds
* Loot collection sounds
* Room transition sounds
* Background ambience

## Save System

Automatic save occurs every frame.

Stored Data:

* Current room
* Currency
* Health
* Upgrades
* Statistics
* Quest progress

Uses:

## Replay System

Records player inputs:

* Movement
* Shooting
* Powerups
* Room transitions

Allows complete run reconstruction for replay viewing.

## Technical Architecture

### Core Game Loop

```javascript
main_game_loop()
```

Responsibilities:

* Input processing
* Entity updates
* Collision detection
* AI updates
* Rendering
* Audio updates
* Save update

### Global State

```javascript
single_global_state_object

Stores:

* Player
* Rooms
* Enemies
* Bullets
* Loot
* UI
* Marketplace
* Statistics

### Player Position

```javascript
player_position_x
player_position_y
```

Available globally for:

* AI tracking
* Visibility calculations
* Procedural systems

### Rendering Pipeline

```javascript
render_entities_and_update_state()
```

Handles:

* Rendering
* Animation
* State updates

in a single optimized pass.

### Enemy Manager

```javascript
enemy_manager_singleton_controller_factory()
```

Responsible for:

* Spawning
* Despawning
* Difficulty scaling
* AI coordination

---

