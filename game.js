 var player_position_x = 0;
        var player_position_y = 0;
        const SoundEngine = {
            audioCtx: null,
            init() { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); },
            generate(type) {
                if (!this.audioCtx) return;
                if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
                const time = this.audioCtx.currentTime;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.connect(gain); gain.connect(this.audioCtx.destination);       
                if (type === 'fire') {
                    osc.type = 'triangle'; osc.frequency.setValueAtTime(400, time);
                    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
                    gain.gain.setValueAtTime(0.1, time); gain.gain.linearRampToValueAtTime(0.01, time + 0.1);
                    osc.start(time); osc.stop(time + 0.1);
                } else if (type === 'hit') {
                    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, time);
                    gain.gain.setValueAtTime(0.12, time); gain.gain.linearRampToValueAtTime(0.01, time + 0.08);
                    osc.start(time); osc.stop(time + 0.08);
                } else if (type === 'pickup') {
                    osc.type = 'sine'; osc.frequency.setValueAtTime(600, time);
                    osc.frequency.setValueAtTime(900, time + 0.06);
                    gain.gain.setValueAtTime(0.08, time); gain.gain.linearRampToValueAtTime(0.01, time + 0.12);
                    osc.start(time); osc.stop(time + 0.12);
                }
            }
        };

        class BulletNode {
            constructor(data) {
                this.data = data;
                this.next = null;
                this.prev = null;
            }
        }

        class BulletDoublyLinkedList {
            constructor() {
                this.head = null;
                this.tail = null;
            }
            append(bullet) {
                const node = new BulletNode(bullet);
                if (!this.head) {
                    this.head = node;
                    this.tail = node;
                } else {
                    this.tail.next = node;
                    node.prev = this.tail;
                    this.tail = node;
                }
            }
            remove(node) {
                if (!node) return;
                if (node.prev) node.prev.next = node.next;
                else this.head = node.next;
                if (node.next) node.next.prev = node.prev;
                else this.tail = node.prev;
            }
            forEach(callback) {
                let current = this.head;
                while (current) {
                    const nextNode = current.next;
                    callback(current.data, current);
                    current = nextNode;
                }
            }
        }

        const SAT = {
            getVertices(box) {
                return [
                    { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y },
                    { x: box.x + box.w, y: box.y + box.h }, { x: box.x, y: box.y + box.h }
                ];
            },
            project(vertices, axis) {
                let min = vertices[0].x * axis.x + vertices[0].y * axis.y;
                let max = min;
                for (let i = 1; i < vertices.length; i++) {
                    const p = vertices[i].x * axis.x + vertices[i].y * axis.y;
                    if (p < min) min = p;
                    if (p > max) max = p;
                }
                return { min, max };
            },
            collides(rectA, rectB) {
                const vA = this.getVertices(rectA);
                const vB = this.getVertices(rectB);
                const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
                for (let i = 0; i < axes.length; i++) {
                    const axis = axes[i];
                    const projA = this.project(vA, axis);
                    const projB = this.project(vB, axis);
                    if (projA.max < projB.min || projB.max < projA.min) return false;
                }
                return true;
            }
        };

        const enemy_manager_singleton_controller_factory = (function() {
            let instance = null;
            return {
                getInstance() {
                    if (!instance) {
                        instance = {
                            spawnGuard(rx, ry, offset) {
                                return {
                                    x: rx + offset.x, y: ry + offset.y,
                                    r: 8, hp: 25, maxHp: 25,
                                    speed: 0.5 + Math.random() * 0.4,
                                    moveCounter: Math.random() * Math.PI,
                                    fireCooldown: 60 + Math.random() * 60
                                };
                            }
                        };
                    }
                    return instance;
                }
            };
        })();

        var single_global_state_object = {
            mode: 'START',
            canvas: null,
            ctx: null,
            maskCanvas: null,
            maskCtx: null,
            viewW: 1371,
            viewH: 856,
            
            gridRows: 6,
            gridCols: 9,
            roomSize: 110, 
            corridorSize: 28, 
            rooms: [],
            
            player: {
                r: 9, hp: 70, maxHp: 100, baseSpeed: 3.0, score: 12500, credits: 4500,
                shieldActive: false, shieldDuration: 0, dmgUpgrade: 1.0, speedUpgrade: 1.0,
                triBurstEnabled: false, fireTimer: 0
            },
            
            bullets: new BulletDoublyLinkedList(),
            pickups: [],
            keys: {},
            mouse: { x: 0, y: 0 }
        };

        window.addEventListener('keydown', e => {
            single_global_state_object.keys[e.key.toLowerCase()] = true;
            if (e.key.toLowerCase() === 'p') {
                if (single_global_state_object.mode === 'ACTION') single_global_state_object.mode = 'HALT';
                else if (single_global_state_object.mode === 'HALT') single_global_state_object.mode = 'ACTION';
                syncInterfaceOverlays();
            }
            if (e.key.toLowerCase() === 'm') toggleShopTerminal();
            if (e.key === ' ') {
                const p = single_global_state_object.player;
                if (!p.shieldActive && p.credits >= 500) {
                    p.credits -= 500; p.shieldActive = true; p.shieldDuration = 240;
                    SoundEngine.generate('pickup');
                }
            }
        });
        window.addEventListener('keyup', e => { single_global_state_object.keys[e.key.toLowerCase()] = false; });

        function initSystem() {
            single_global_state_object.canvas = document.getElementById('gameCanvas');
            single_global_state_object.ctx = single_global_state_object.canvas.getContext('2d');
            single_global_state_object.canvas.width = single_global_state_object.viewW;
            single_global_state_object.canvas.height = single_global_state_object.viewH;
            single_global_state_object.maskCanvas = document.createElement('canvas');
            single_global_state_object.maskCanvas.width = single_global_state_object.viewW;
            single_global_state_object.maskCanvas.height = single_global_state_object.viewH;
            single_global_state_object.maskCtx = single_global_state_object.maskCanvas.getContext('2d');
            single_global_state_object.canvas.addEventListener('mousemove', e => {
                const rect = single_global_state_object.canvas.getBoundingClientRect();
                single_global_state_object.mouse.x = e.clientX - rect.left;
                single_global_state_object.mouse.y = e.clientY - rect.top;
            });
            single_global_state_object.canvas.addEventListener('mousedown', () => {
                if (single_global_state_object.mode === 'ACTION') firePlayerArmament();
            });
            SoundEngine.init();
            buildTacticalGrid();
            setInterval(main_game_loop, 1000 / 60);
        }
        function buildTacticalGrid() {
            single_global_state_object.rooms = [];
            const spawnController = enemy_manager_singleton_controller_factory.getInstance();
            const rSize = single_global_state_object.roomSize;
            const cSize = single_global_state_object.corridorSize;
            const startX = 60; const startY = 30;

            for (let r = 0; r < single_global_state_object.gridRows; r++) {
                for (let c = 0; c < single_global_state_object.gridCols; c++) {
                    const rx = startX + c * (rSize + cSize); const ry = startY + r * (rSize + cSize);
                    
                    const walls = [
                        { x: rx, y: ry, w: rSize, h: 6 }, { x: rx, y: ry + rSize - 6, w: rSize, h: 6 },
                        { x: rx, y: ry, w: 6, h: rSize }, { x: rx + rSize - 6, y: ry, w: 6, h: rSize }
                    ];
                    const doors = [];
                    const doorType = (c + r) % 3;
                    if (doorType === 0) {
                        doors.push({ x: rx, y: ry + rSize / 2 - 12, w: 6, h: 24 }); 
                    } else if (doorType === 1) {
                        doors.push({ x: rx + rSize / 2 - 12, y: ry, w: 24, h: 6 }); 
                    } else {
                        doors.push({ x: rx + rSize - 6, y: ry + rSize / 2 - 12, w: 6, h: 24 }); 
                    }
                    const bots = [];
                    const insideOffset = 25 + Math.random() * (rSize - 50);
                    bots.push(spawnController.spawnGuard(rx, ry, { x: insideOffset, y: insideOffset }));
                    single_global_state_object.rooms.push({
                        x: rx, y: ry, w: rSize, h: rSize, walls: walls, doors: doors, bots: bots
                    });
                }
            }
            player_position_x = startX - 22;
            player_position_y = startY - 12;
        }

        function handleScreenSystemAction() {
            if (['START', 'TERMINATED', 'COMPLETE'].includes(single_global_state_object.mode)) {
                buildTacticalGrid();
                single_global_state_object.player.hp = 100;
                single_global_state_object.player.score = 12500;
                single_global_state_object.player.credits = 4500;
                single_global_state_object.bullets = new BulletDoublyLinkedList();
                single_global_state_object.pickups = [];
                single_global_state_object.mode = 'ACTION';
            } else if (single_global_state_object.mode === 'HALT') {
                single_global_state_object.mode = 'ACTION';
            }
            syncInterfaceOverlays();
        }

        function toggleShopTerminal() {
            const modal = document.getElementById('shop-modal');
            if (single_global_state_object.mode === 'ACTION') {
                single_global_state_object.mode = 'HALT'; modal.style.display = 'flex';
                document.getElementById('shop-credits').innerText = single_global_state_object.player.credits + "L";
            } else if (modal.style.display === 'flex') {
                modal.style.display = 'none'; single_global_state_object.mode = 'ACTION';
            }
            syncInterfaceOverlays();
        }

        function purchaseUpgrade(type) {
            const p = single_global_state_object.player;
            if (type === 'hp' && p.credits >= 1000) {
                p.credits -= 1000; p.hp = Math.min(p.maxHp, p.hp + 30); SoundEngine.generate('pickup');
            } else if (type === 'dmg' && p.credits >= 2000) {
                p.credits -= 2000; p.dmgUpgrade += 0.25; SoundEngine.generate('pickup');
            } else if (type === 'speed' && p.credits >= 1500) {
                p.credits -= 1500; p.speedUpgrade += 0.15; SoundEngine.generate('pickup');
            } else if (type === 'burst' && p.credits >= 3000) {
                p.credits -= 3000; p.triBurstEnabled = true; SoundEngine.generate('pickup');
            }
            document.getElementById('shop-credits').innerText = p.credits + "L";
            updateDisplayHUD();
        }

        function updateDisplayHUD() {
            const p = single_global_state_object.player;
            document.getElementById('hud-hp').innerText = Math.ceil(p.hp);
            document.getElementById('hud-hp-fill').style.width = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) + "%";
            document.getElementById('hud-score').innerText = p.score;
            document.getElementById('hud-credits').innerText = p.credits + "L";
            
            const shieldStatus = document.getElementById('hud-shield-status');
            if (p.shieldActive) {
                shieldStatus.innerText = "Active (" + Math.ceil(p.shieldDuration / 60) + "s)";
                shieldStatus.className = "active";
            } else {
                shieldStatus.innerText = "Deflector Off";
                shieldStatus.className = "";
            }
        }

        function syncInterfaceOverlays() {
            const ov = document.getElementById('screen-overlay');
            const title = document.getElementById('screen-title'); const desc = document.getElementById('screen-desc');
            const btn = document.getElementById('screen-btn');
            const brief = document.getElementById('briefing-elements');

            if (single_global_state_object.mode === 'ACTION') {
                ov.style.display = 'none';
            } else {
                ov.style.display = 'flex';
                if (single_global_state_object.mode === 'HALT') {
                    title.innerText = "Execution Paused";
                    desc.innerText = "System engine loop buffered. Click below to re-enter the sector matrix.";
                    btn.innerText = "Resume Simulation Threads";
                    brief.style.display = 'none';
                } else if (single_global_state_object.mode === 'TERMINATED') {
                    title.innerText = "System Integrity Failure";
                    desc.innerText = "Hardware chassis compromised inside the dark sector.";
                    btn.innerText = "Re-Initialize System Parameters";
                    brief.style.display = 'block';
                } else if (single_global_state_object.mode === 'COMPLETE') {
                    title.innerText = "Sector Sweep Success";
                    desc.innerText = "All defense drone anomalies eliminated within structural bounds.";
                    btn.innerText = "Run Sector Refactor";
                    brief.style.display = 'block';
                }
            }
        }

        function firePlayerArmament() {
            const p = single_global_state_object.player; if (p.fireTimer > 0) return; p.fireTimer = 14;
            const ang = Math.atan2(single_global_state_object.mouse.y - player_position_y, single_global_state_object.mouse.x - player_position_x);
            const barrelLength = p.r + 4;
            const spawnX = player_position_x + Math.cos(ang) * barrelLength;
            const spawnY = player_position_y + Math.sin(ang) * barrelLength;
            spawnBulletObject(spawnX, spawnY, ang, true);
            if (p.triBurstEnabled) {
                spawnBulletObject(spawnX, spawnY, ang - 0.12, true);
                spawnBulletObject(spawnX, spawnY, ang + 0.12, true);
            }
            SoundEngine.generate('fire');
        }
        function spawnBulletObject(x, y, angle, isPlayerOwned) {
            const speed = isPlayerOwned ? 6.5 : 3.5;
            single_global_state_object.bullets.append({
                x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                size: 4, isPlayer: isPlayerOwned, bounces: 0
            });
        }
        function main_game_loop() {
            if (single_global_state_object.mode !== 'ACTION') return;
            render_entities_and_update_state();
            updateDisplayHUD();
        }
        function render_entities_and_update_state() {
            const ctx = single_global_state_object.ctx;
            const mCtx = single_global_state_object.maskCtx;
            const p = single_global_state_object.player;
            if (p.fireTimer > 0) p.fireTimer--;
            if (p.shieldActive) { p.shieldDuration--; if (p.shieldDuration <= 0) p.shieldActive = false; }
            let mx = 0; let my = 0;
            if (single_global_state_object.keys['w']) my -= 1; if (single_global_state_object.keys['s']) my += 1;
            if (single_global_state_object.keys['a']) mx -= 1; if (single_global_state_object.keys['d']) mx += 1;
            if (mx !== 0 && my !== 0) { mx *= 0.7071; my *= 0.7071; }
            const pSpeed = p.baseSpeed * p.speedUpgrade;
            const nextX = player_position_x + mx * pSpeed; const nextY = player_position_y + my * pSpeed;
            const boxX = { x: nextX - p.r, y: player_position_y - p.r, w: p.r * 2, h: p.r * 2 };
            let crashX = false;
            single_global_state_object.rooms.forEach(rm => {
                rm.walls.forEach(w => {
                    let insideDoor = false;
                    rm.doors.forEach(d => { if (nextX >= d.x && nextX <= d.x + d.w && player_position_y >= d.y && player_position_y <= d.y + d.h) insideDoor = true; });
                    if (!insideDoor && SAT.collides(boxX, w)) crashX = true;
                });
            });
            if (!crashX) player_position_x = nextX;
            const boxY = { x: player_position_x - p.r, y: nextY - p.r, w: p.r * 2, h: p.r * 2 };
            let crashY = false;
            single_global_state_object.rooms.forEach(rm => {
                rm.walls.forEach(w => {
                    let insideDoor = false;
                    rm.doors.forEach(d => { if (player_position_x >= d.x && player_position_x <= d.x + d.w && nextY >= d.y && nextY <= d.y + d.h) insideDoor = true; });
                    if (!insideDoor && SAT.collides(boxY, w)) crashY = true;
                });
            });
            if (!crashY) player_position_y = nextY;
            single_global_state_object.rooms.forEach(rm => {
                rm.bots.forEach(bot => {
                    bot.moveCounter += 0.03;
                    let targetX = bot.x + Math.sin(bot.moveCounter) * bot.speed;
                    let targetY = bot.y + Math.cos(bot.moveCounter) * bot.speed;
                    if (targetX > rm.x + 8 && targetX < rm.x + rm.w - 8) bot.x = targetX;
                    if (targetY > rm.y + 8 && targetY < rm.y + rm.h - 8) bot.y = targetY;
                    
                    if (Math.hypot(player_position_x - bot.x, player_position_y - bot.y) < 280) {
                        bot.fireCooldown--;
                        if (bot.fireCooldown <= 0) {
                            bot.fireCooldown = 90 + Math.random() * 50;
                            spawnBulletObject(bot.x, bot.y, Math.atan2(player_position_y - bot.y, player_position_x - bot.x), false);
                        }
                    }
                });
            });
            single_global_state_object.bullets.forEach((b, node) => {
                const oldX = b.x; const oldY = b.y;
                b.x += b.vx; b.y += b.vy;
                if (b.x < 0 || b.x > single_global_state_object.viewW || b.y < 0 || b.y > single_global_state_object.viewH) { 
                    single_global_state_object.bullets.remove(node); return; 
                }
                const bBox = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
                single_global_state_object.rooms.forEach(rm => {
                    rm.walls.forEach(w => {
                        if (SAT.collides(bBox, w)) {
                            let throughDoor = false;
                            rm.doors.forEach(d => { 
                                if (b.x >= d.x - 3 && b.x <= d.x + d.w + 3 && b.y >= d.y - 3 && b.y <= d.y + d.h + 3) {
                                    throughDoor = true; 
                                }
                            });
                            if (!throughDoor) {
                                b.bounces++;
                                if (b.bounces > 4) {
                                    single_global_state_object.bullets.remove(node);
                                } else {
                                    b.x = oldX; b.y = oldY;
                                    if (Math.abs(oldX - (w.x + w.w / 2)) > Math.abs(oldY - (w.y + w.h / 2))) { 
                                        b.vx *= -1; 
                                    } else { 
                                        b.vy *= -1; 
                                    }
                                }
                            }
                        }
                    });
                });
                if (b.isPlayer) {
                    single_global_state_object.rooms.forEach(rm => {
                        rm.bots.forEach((bot, idx) => {
                            if (Math.hypot(b.x - bot.x, b.y - bot.y) < bot.r + b.size / 2) {
                                bot.hp -= (15 * p.dmgUpgrade); SoundEngine.generate('hit'); single_global_state_object.bullets.remove(node);
                                if (bot.hp <= 0) {
                                    rm.bots.splice(idx, 1); p.score += 250; p.credits += 200;
                                    if (Math.random() > 0.3) single_global_state_object.pickups.push({ x: bot.x, y: bot.y, val: 300 });
                                }
                            }
                        });
                    });
                } else {
                    if (Math.hypot(b.x - player_position_x, b.y - player_position_y) < p.r + b.size / 2) {
                        single_global_state_object.bullets.remove(node);
                        if (p.shieldActive) { 
                            p.score += 50; 
                        } else { 
                            p.hp -= 12; 
                            SoundEngine.generate('hit'); 
                        }
                        if (p.hp <= 0) { 
                            single_global_state_object.mode = 'TERMINATED'; 
                            syncInterfaceOverlays(); 
                        }
                    }
                }
            });
            single_global_state_object.pickups.forEach((pk, idx) => {
                if (Math.hypot(player_position_x - pk.x, player_position_y - pk.y) < p.r + 8) {
                    p.credits += pk.val; p.score += 100; SoundEngine.generate('pickup');
                    single_global_state_object.pickups.splice(idx, 1);
                }
            });
            let remainingBots = 0;
            single_global_state_object.rooms.forEach(rm => remainingBots += rm.bots.length);
            if (remainingBots === 0) { single_global_state_object.mode = 'COMPLETE'; syncInterfaceOverlays(); }
            mCtx.fillStyle = 'rgba(0, 0, 0, 1)';
            mCtx.fillRect(0, 0, single_global_state_object.viewW, single_global_state_object.viewH);
            const mouseAng = Math.atan2(single_global_state_object.mouse.y - player_position_y, single_global_state_object.mouse.x - player_position_x);
            const coneAngle = 0.62; 
            const flashlightRadius = 310;
            mCtx.save();
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.beginPath();
            mCtx.moveTo(player_position_x, player_position_y);
            mCtx.arc(player_position_x, player_position_y, flashlightRadius, mouseAng - coneAngle, mouseAng + coneAngle);
            mCtx.closePath();
            mCtx.fill();
            mCtx.beginPath();
            mCtx.arc(player_position_x, player_position_y, p.r + 20, 0, Math.PI * 2);
            mCtx.fill();
            mCtx.restore();
            ctx.fillStyle = '#2e114d';
            ctx.fillRect(0, 0, single_global_state_object.viewW, single_global_state_object.viewH);
            single_global_state_object.rooms.forEach(rm => {
                ctx.fillStyle = '#09140d';
                ctx.fillRect(rm.x, rm.y, rm.w, rm.h);
                ctx.fillStyle = '#00ff66';
                rm.walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));
                ctx.fillStyle = '#ffcc00';
                rm.doors.forEach(d => ctx.fillRect(d.x, d.y, d.w, d.h));
            });
            single_global_state_object.pickups.forEach(pk => {
                ctx.fillStyle = '#ffcc00';
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(pk.x, pk.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });
            single_global_state_object.rooms.forEach(rm => {
                rm.bots.forEach(bot => {
                    ctx.fillStyle = '#ff3366';
                    ctx.beginPath(); ctx.arc(bot.x, bot.y, bot.r, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(bot.x, bot.y, bot.r - 5, 0, Math.PI * 2); ctx.fill();
                    const barW = bot.r * 2; const barH = 2;
                    ctx.fillStyle = '#3a111a';
                    ctx.fillRect(bot.x - bot.r, bot.y - bot.r - 6, barW, barH);
                    ctx.fillStyle = '#ff3366';
                    ctx.fillRect(bot.x - bot.r, bot.y - bot.r - 6, barW * (bot.hp / bot.maxHp), barH);
                });
            });
            single_global_state_object.bullets.forEach(b => {
                ctx.fillStyle = b.isPlayer ? '#ffcc00' : '#ff4575';
                ctx.shadowColor = b.isPlayer ? '#ffcc00' : '#ff4575';
                ctx.shadowBlur = b.isPlayer ? 3 : 6;
                ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });
            ctx.fillStyle = '#cc9629';
            ctx.beginPath(); ctx.arc(player_position_x, player_position_y, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.save();
            ctx.translate(player_position_x, player_position_y);
            ctx.rotate(mouseAng);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(p.r - 2, -2, 6, 4);
            ctx.restore();
            if (p.shieldActive) {
                ctx.strokeStyle = '#00ffcc';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#00ffcc';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(player_position_x, player_position_y, p.r + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            ctx.drawImage(single_global_state_object.maskCanvas, 0, 0);
        }
        window.onload = initSystem;
