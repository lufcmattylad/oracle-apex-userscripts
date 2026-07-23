// ==UserScript==
// @name         Oracle APEX Pets
// @run-at       document-start
// @namespace    https://github.com/lufcmattylad
// @version      26.1.2
// @description  Adds roaming pets to the Oracle APEX top navigation bar (requires oracle-apex-top-level-navigation userscript)
// @author       Matt Mulvaney - @Matt_Mulvaney
// @match        *://*/ords/*
// @match        *://*/pls/*
// @tag          orclapex
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/lufcmattylad/oracle-apex-userscripts/refs/heads/main/scripts/oracle-apex-pets/script.js
// ==/UserScript==

(function () {
    'use strict';

    /**
     * DISCLAIMER:
     * This code is unofficial and is not supported by Oracle APEX.
     * It is provided "as is" without warranty of any kind, either express or implied.
     * Use of this code is at your own risk. The authors and distributors accept no responsibility
     * for any consequences arising from its use.
     */

    /**
     * CREDITS:
     * Pet artwork, animations and behaviour are from the vscode-pets project
     * by Anthony Shaw (@tonybaloney) and contributors, used under the MIT License.
     * https://github.com/tonybaloney/vscode-pets
     * https://github.com/tonybaloney/vscode-pets#credits
     */

    const MEDIA_BASE = 'https://raw.githubusercontent.com/tonybaloney/vscode-pets/main/media/';

    /* All animals from vscode-pets that have idle, walk, run and with_ball
       animations. speedMul mirrors vscode-pets per-pet speeds (rocky never
       moves, snail is very slow, turtle is slow). */
    const PET_TYPES = {
        chicken: { color: 'brown' },
        clippy: { color: 'yellow' },
        cockatiel: { color: 'gray' },
        crab: { color: 'red' },
        deno: { color: 'green' },
        dog: { color: 'brown' },
        fox: { color: 'red' },
        horse: { color: 'black' },
        mod: { color: 'purple' },
        monkey: { color: 'gray' },
        morph: { color: 'purple' },
        panda: { color: 'black' },
        rat: { color: 'brown' },
        rocky: { color: 'gray', speedMul: 0 },
        'rubber-duck': { color: 'yellow' },
        skeleton: { color: 'orange' },
        snail: { color: 'brown', speedMul: 0.3 },
        snake: { color: 'green' },
        totoro: { color: 'gray' },
        turtle: { color: 'green', speedMul: 0.6 },
        zappy: { color: 'yellow' },
    };

    function gifUrl(type, anim) {
        return MEDIA_BASE + type + '/' + PET_TYPES[type].color + '_' + anim + '_8fps.gif';
    }

    const PET_CONFIG = {
        /* vscode-pets ticks every 100ms at PetSpeed.normal = 3px/tick,
           randomized 0.7x-1.3x per pet */
        tickMs: 100,
        baseSpeed: 3,
        size: 28,
        headerSelector: '.b-Header',
    };

    /* Ball physics constants from vscode-pets ball.ts */
    const BALL_CONFIG = {
        gravity: 0.6,
        damping: 0.9,
        traction: 0.8,
        frameMs: 1000 / 24,
        radius: 4,
        color: '#2ed851',
        maxAgeMs: 30000,
    };

    /* Pet state machine */
    const States = {
        IDLE: 'idle',
        WALK_RIGHT: 'walkRight',
        WALK_LEFT: 'walkLeft',
        CHASE: 'chase',
        WITH_BALL: 'withBall',
        SWIPE: 'swipe',
    };

    /* Storage management */
    const Storage = {
        PETS_KEY: 'apex_pets_config',

        getConfig() {
            try {
                const stored = localStorage.getItem(this.PETS_KEY);
                if (stored) {
                    return JSON.parse(stored);
                }
                return this.getDefaults();
            } catch {
                return this.getDefaults();
            }
        },

        getDefaults() {
            const defaults = {};
            Object.keys(PET_TYPES).forEach(animal => {
                defaults[animal] = 0;
            });
            defaults.dog = 1;
            defaults.fox = 1;
            return defaults;
        },

        setQuantity(animal, quantity) {
            const config = this.getConfig();
            config[animal] = Math.max(0, Math.min(10, quantity));
            localStorage.setItem(this.PETS_KEY, JSON.stringify(config));
        },

        getQuantity(animal) {
            const config = this.getConfig();
            return config[animal] || 0;
        },
    };

    /* Preload cache: keeps Image references alive so state changes never
       show a half-loaded (broken border) frame */
    const preloadCache = {};

    function preloadGifs(type) {
        const anims = ['idle', 'walk', 'run', 'swipe'];
        if (type !== 'rocky') {
            anims.push('with_ball');
        }
        anims.forEach(anim => {
            const url = gifUrl(type, anim);
            if (!preloadCache[url]) {
                const img = new Image();
                img.src = url;
                preloadCache[url] = img;
            }
        });
    }

    /* Inject styles */
    GM_addStyle(`
        .apex-pet {
            position: fixed;
            z-index: 101;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
            pointer-events: auto;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .apex-pet img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: contain;
            /* Bottom-align sprites in their square box: wide GIFs like the
               crab (150x90) otherwise get vertically centered and appear to
               float above the floor line */
            object-position: bottom;
            visibility: hidden;
        }

        .apex-pet img.is-loaded {
            visibility: visible;
        }

        .apex-pet.facing-left img {
            transform: scaleX(-1);
        }

        .apex-pets-ball {
            position: fixed;
            z-index: 101;
            border-radius: 50%;
            pointer-events: none;
        }

        .apex-pets-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 450px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .apex-pets-modal-header {
            padding: 16px;
            border-bottom: 1px solid #eee;
            font-weight: bold;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .apex-pets-modal-content {
            padding: 16px;
        }

        .apex-pets-modal-close {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .apex-pets-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.3);
            z-index: 9999;
        }

        .apex-pets-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border: 1px solid #eee;
            border-radius: 4px;
            margin-bottom: 6px;
            background: #f9f9f9;
        }

        .apex-pets-item-name {
            flex: 1;
            font-weight: 500;
            text-transform: capitalize;
        }

        .apex-pets-item-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .apex-pets-button {
            padding: 4px 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            background: #f3f3f3;
            cursor: pointer;
            font-size: 14px;
            min-width: 28px;
        }

        .apex-pets-button:hover {
            background: #e3e3e3;
        }

        .apex-pets-quantity {
            min-width: 30px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
        }

        .apex-pets-modal-footer {
            padding: 16px;
            border-top: 1px solid #eee;
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .apex-pets-button.primary {
            background: #0078d4;
            color: white;
            border-color: #0078d4;
        }

        .apex-pets-button.primary:hover {
            background: #005a9e;
        }
    `);

    function getFloorY() {
        const header = document.querySelector(PET_CONFIG.headerSelector);
        if (!header) return 0;
        return header.getBoundingClientRect().bottom;
    }

    /* Pets and the ball walk/bounce along the header's own width, not the
       full window - the Centered Layout userscript (and any theme that
       centers the nav bar) can leave the header narrower than the viewport */
    function getHeaderBounds() {
        const header = document.querySelector(PET_CONFIG.headerSelector);
        if (!header) return { left: 0, right: window.innerWidth };
        const rect = header.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
    }

    /* Bouncing ball, ported from vscode-pets ball.ts */
    class Ball {
        constructor() {
            this.el = document.createElement('div');
            this.el.className = 'apex-pets-ball';
            const d = BALL_CONFIG.radius * 2;
            this.el.style.width = d + 'px';
            this.el.style.height = d + 'px';
            this.el.style.background = BALL_CONFIG.color;
            this.el.style.display = 'none';
            document.body.appendChild(this.el);

            this.active = false;
            this.caught = false;
            this.cx = 0;
            this.cy = 0;
            this.vx = 0;
            this.vy = 0;
            this.thrownAt = 0;
            this.lastFrame = 0;
        }

        throw() {
            const { left, right } = getHeaderBounds();
            this.cx = left + 40 + Math.random() * ((right - left) * 0.4);
            this.cy = Math.max(getFloorY() - 120, 10);
            this.vx = (2 + Math.random() * 4) * (Math.random() > 0.5 ? 1 : -1);
            this.vy = 5;
            this.caught = false;
            this.active = true;
            this.thrownAt = Date.now();
            this.el.style.display = 'block';
            this.loop();
        }

        loop() {
            if (!this.active || this.caught) return;

            requestAnimationFrame(() => this.loop());

            /* throttle to 24fps like vscode-pets */
            const now = Date.now();
            if (now - this.lastFrame <= BALL_CONFIG.frameMs) return;
            this.lastFrame = now;

            /* despawn if nobody caught it */
            if (now - this.thrownAt > BALL_CONFIG.maxAgeMs) {
                this.hide();
                return;
            }

            const r = BALL_CONFIG.radius;
            const { left, right } = getHeaderBounds();
            const floorY = getFloorY();

            if (this.cx + r >= right) {
                this.vx = -this.vx * BALL_CONFIG.damping;
                this.cx = right - r;
            } else if (this.cx - r <= left) {
                this.vx = -this.vx * BALL_CONFIG.damping;
                this.cx = left + r;
            }
            if (this.cy + r >= floorY) {
                this.vy = -this.vy * BALL_CONFIG.damping;
                this.cy = floorY - r;
                this.vx *= BALL_CONFIG.traction;
            } else if (this.cy - r <= 0) {
                this.vy = -this.vy * BALL_CONFIG.damping;
                this.cy = r;
            }

            this.vy += BALL_CONFIG.gravity;

            this.cx += this.vx;
            this.cy += this.vy;

            this.el.style.left = (this.cx - r) + 'px';
            this.el.style.top = (this.cy - r) + 'px';
        }

        catch() {
            this.caught = true;
            this.hide();
        }

        hide() {
            this.active = false;
            this.el.style.display = 'none';
        }

        remove() {
            this.hide();
            if (this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
        }
    }

    /* The single shared ball, owned by PetManager */
    let activeBall = null;

    /* Pet class */
    class ApexPet {
        constructor(type) {
            this.type = type;
            this.el = document.createElement('div');
            this.el.className = 'apex-pet';
            this.el.style.width = PET_CONFIG.size + 'px';
            this.el.style.height = PET_CONFIG.size + 'px';

            this.img = document.createElement('img');
            this.img.alt = '';
            this.img.draggable = false;
            this.img.addEventListener('load', () => {
                this.img.classList.add('is-loaded');
            });
            this.el.appendChild(this.img);

            const spawnBounds = getHeaderBounds();
            this.left = spawnBounds.left + Math.random() * (spawnBounds.right - spawnBounds.left - PET_CONFIG.size);
            this.state = null;
            this.stateTicks = 0;
            this.idleHold = this.randomIdleHold();

            /* vscode-pets randomizes each pet's speed 0.7x-1.3x */
            const typeInfo = PET_TYPES[type];
            const speedMul = typeInfo.speedMul !== undefined ? typeInfo.speedMul : 1;
            this.speed = PET_CONFIG.baseSpeed * (0.7 + Math.random() * 0.6) * speedMul;

            this.direction = Math.random() > 0.5 ? -1 : 1;

            /* Click interaction: swipe animation, nothing said */
            this.el.addEventListener('click', () => this.swipe());

            this.updatePosition();

            /* No spawn delay: pick walk/idle right away, and keep any
               initial idle short (under a second) so pets feel alive
               as soon as they appear */
            this.decideNextMove();
            if (this.state === States.IDLE) {
                this.idleHold = Math.floor(Math.random() * 10);
            }
        }

        swipe() {
            if (this.state === States.SWIPE || this.state === States.WITH_BALL) return;
            this.setState(States.SWIPE);
        }

        randomIdleHold() {
            /* vscode-pets sit-idle holds ~50 ticks (5s); vary it a little */
            return 30 + Math.floor(Math.random() * 40);
        }

        setState(newState) {
            if (this.state === newState) return;
            this.state = newState;
            this.stateTicks = 0;

            const anim =
                newState === States.IDLE ? 'idle' :
                newState === States.CHASE ? 'run' :
                newState === States.WITH_BALL ? 'with_ball' :
                newState === States.SWIPE ? 'swipe' :
                'walk';
            const url = gifUrl(this.type, anim);
            if (this.img.src !== url) {
                /* Hide until loaded to avoid the broken-image border flash */
                if (!preloadCache[url] || !preloadCache[url].complete) {
                    this.img.classList.remove('is-loaded');
                }
                this.img.src = url;
            }
        }

        setFacing() {
            this.el.classList.toggle('facing-left', this.direction === -1);
        }

        updatePosition() {
            const header = document.querySelector(PET_CONFIG.headerSelector);
            if (!header) return;

            const headerRect = header.getBoundingClientRect();

            this.el.style.left = this.left + 'px';
            this.el.style.top = Math.max(headerRect.bottom - PET_CONFIG.size, 0) + 'px';
        }

        get canChase() {
            return this.speed > 0 &&
                this.state !== States.WITH_BALL &&
                this.state !== States.SWIPE;
        }

        nextFrame() {
            this.stateTicks++;

            /* Ball chasing takes priority, like vscode-pets ChaseState */
            if (activeBall && activeBall.active && !activeBall.caught && this.canChase) {
                this.chaseBall();
                this.updatePosition();
                return;
            }

            switch (this.state) {
                case States.IDLE:
                    if (this.stateTicks > this.idleHold) {
                        this.decideNextMove();
                    }
                    break;

                case States.CHASE:
                    /* Ball vanished (caught by another pet or despawned) */
                    this.decideNextMove();
                    break;

                case States.WITH_BALL:
                    /* vscode-pets IdleWithBallState holds 30 ticks (3s) */
                    if (this.stateTicks > 30) {
                        this.decideNextMove();
                    }
                    break;

                case States.SWIPE:
                    /* vscode-pets SwipeState holds 15 ticks (1.5s) */
                    if (this.stateTicks > 15) {
                        this.decideNextMove();
                    }
                    break;

                case States.WALK_RIGHT:
                case States.WALK_LEFT: {
                    const walkBounds = getHeaderBounds();
                    const maxLeft = walkBounds.right - PET_CONFIG.size - 20;
                    const minLeft = walkBounds.left + 20;

                    this.left += this.direction * this.speed;

                    if (this.left >= maxLeft) {
                        this.left = maxLeft;
                        this.direction = -1;
                        this.setState(States.WALK_LEFT);
                        this.setFacing();
                    } else if (this.left <= minLeft) {
                        this.left = minLeft;
                        this.direction = 1;
                        this.setState(States.WALK_RIGHT);
                        this.setFacing();
                    }

                    /* vscode-pets walk states hold ~60 ticks before re-deciding */
                    if (this.stateTicks > 60) {
                        this.decideNextMove();
                    }
                    break;
                }
            }

            this.updatePosition();
        }

        /* Ported from vscode-pets ChaseState */
        chaseBall() {
            this.setState(States.CHASE);

            const petCenter = this.left + PET_CONFIG.size / 2;

            if (petCenter > activeBall.cx) {
                this.direction = -1;
            } else {
                this.direction = 1;
            }
            this.setFacing();
            this.left += this.direction * this.speed;

            /* Catch: ball near the floor and pet on top of it */
            const ballNearFloor = getFloorY() - activeBall.cy < PET_CONFIG.size;
            if (ballNearFloor && Math.abs(petCenter - activeBall.cx) < 15) {
                activeBall.catch();
                this.setState(States.WITH_BALL);
            }
        }

        decideNextMove() {
            /* Rocks never walk */
            if (this.speed === 0) {
                this.setState(States.IDLE);
                this.stateTicks = 0;
                this.idleHold = this.randomIdleHold();
                return;
            }

            if (Math.random() > 0.5) {
                this.direction = Math.random() > 0.5 ? 1 : -1;
                this.setState(this.direction === 1 ? States.WALK_RIGHT : States.WALK_LEFT);
                this.setFacing();
            } else {
                this.setState(States.IDLE);
                this.idleHold = this.randomIdleHold();
            }
        }

        remove() {
            if (this.el && this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
        }
    }

    /* Settings Modal */
    class PetsSettingsModal {
        constructor(onClose) {
            this.overlay = null;
            this.modal = null;
            this.onClose = onClose;
            this.quantityElements = {};
        }

        open() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'apex-pets-overlay';
            this.overlay.onclick = () => this.close();

            this.modal = document.createElement('div');
            this.modal.className = 'apex-pets-modal';
            this.modal.onclick = (e) => e.stopPropagation();

            const header = document.createElement('div');
            header.className = 'apex-pets-modal-header';
            header.innerHTML = '<span>Pet Configuration</span>';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'apex-pets-modal-close';
            closeBtn.textContent = '✕';
            closeBtn.onclick = () => this.close();
            header.appendChild(closeBtn);

            const content = document.createElement('div');
            content.className = 'apex-pets-modal-content';

            const animalList = document.createElement('div');

            Object.keys(PET_TYPES).sort().forEach(animal => {
                const item = document.createElement('div');
                item.className = 'apex-pets-item';

                const name = document.createElement('div');
                name.className = 'apex-pets-item-name';
                name.textContent = animal.replace('-', ' ');

                const controls = document.createElement('div');
                controls.className = 'apex-pets-item-controls';

                const minusBtn = document.createElement('button');
                minusBtn.className = 'apex-pets-button';
                minusBtn.textContent = '−';

                const quantity = document.createElement('div');
                quantity.className = 'apex-pets-quantity';
                quantity.textContent = Storage.getQuantity(animal);
                this.quantityElements[animal] = quantity;

                const plusBtn = document.createElement('button');
                plusBtn.className = 'apex-pets-button';
                plusBtn.textContent = '+';

                minusBtn.onclick = () => this.decreaseQuantity(animal);
                plusBtn.onclick = () => this.increaseQuantity(animal);

                controls.appendChild(minusBtn);
                controls.appendChild(quantity);
                controls.appendChild(plusBtn);

                item.appendChild(name);
                item.appendChild(controls);
                animalList.appendChild(item);
            });

            content.appendChild(animalList);

            const footer = document.createElement('div');
            footer.className = 'apex-pets-modal-footer';

            const closeFooterBtn = document.createElement('button');
            closeFooterBtn.className = 'apex-pets-button primary';
            closeFooterBtn.textContent = 'Close';
            closeFooterBtn.onclick = () => this.close();

            footer.appendChild(closeFooterBtn);

            this.modal.appendChild(header);
            this.modal.appendChild(content);
            this.modal.appendChild(footer);

            document.body.appendChild(this.overlay);
            document.body.appendChild(this.modal);
        }

        increaseQuantity(animal) {
            const current = Storage.getQuantity(animal);
            Storage.setQuantity(animal, current + 1);
            this.quantityElements[animal].textContent = Storage.getQuantity(animal);
        }

        decreaseQuantity(animal) {
            const current = Storage.getQuantity(animal);
            Storage.setQuantity(animal, current - 1);
            this.quantityElements[animal].textContent = Storage.getQuantity(animal);
        }

        close() {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            if (this.onClose) {
                this.onClose();
            }
        }
    }

    /* Pet manager */
    class PetManager {
        constructor() {
            this.pets = [];
            this.tickTimer = null;
            this.container = null;
            this.initialized = false;
        }

        async init() {
            if (this.initialized) return;

            /* Wait for header to be present */
            let attempts = 0;
            while (!document.querySelector(PET_CONFIG.headerSelector) && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            const header = document.querySelector(PET_CONFIG.headerSelector);
            if (!header) {
                return;
            }

            this.initialized = true;

            /* Create container */
            this.container = document.createElement('div');
            this.container.id = 'apex-pets-container';
            this.container.style.position = 'fixed';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100%';
            this.container.style.height = '100vh';
            this.container.style.pointerEvents = 'none';
            this.container.style.zIndex = '100';
            this.container.style.overflow = 'visible';
            document.body.appendChild(this.container);

            /* Load and spawn pets */
            this.loadPets();
            this.startAnimation();

            /* Add settings to account menu */
            this.addSettingsMenuEntry();
        }

        throwBall() {
            if (!activeBall) {
                activeBall = new Ball();
            }
            activeBall.throw();
        }

        addSettingsMenuEntry() {
            const self = this;
            let attempts = 0;

            /* The Account region is loaded via AJAX (a-dynamic-content), so poll
               until the accountMenu widget instance exists with its items */
            const tryAddItem = () => {
                if (typeof apex === 'undefined' || !apex.jQuery) {
                    if (++attempts < 120) setTimeout(tryAddItem, 250);
                    return;
                }

                const $ = apex.jQuery;
                const $menu = $('#accountMenu_menu');

                if (!$menu.length || !$menu.data('apex-menu')) {
                    if (++attempts < 120) setTimeout(tryAddItem, 250);
                    return;
                }

                const items = $menu.menu('option', 'items') || [];

                /* Wait until APEX has populated the menu with its own items */
                if (items.length === 0) {
                    if (++attempts < 120) setTimeout(tryAddItem, 250);
                    return;
                }

                if (items.some(item => item._apexPetsSettings)) return;

                const petsMenu = {
                    type: 'subMenu',
                    label: 'Pets',
                    _apexPetsSettings: true,
                    menu: {
                        items: [
                            {
                                type: 'action',
                                label: 'Settings',
                                action: function () {
                                    const modal = new PetsSettingsModal(() => {
                                        self.refreshPets();
                                    });
                                    modal.open();
                                }
                            },
                            {
                                type: 'action',
                                label: 'Throw Ball',
                                action: function () {
                                    self.throwBall();
                                }
                            }
                        ]
                    }
                };

                /* Insert above the Sign Out entry; fall back to the end */
                const signOutIndex = items.findIndex(item =>
                    (item.label && /sign\s*out/i.test(item.label)) ||
                    (typeof item.href === 'string' && /logout|signout/i.test(item.href))
                );

                if (signOutIndex >= 0) {
                    items.splice(signOutIndex, 0, petsMenu, { type: 'separator' });
                } else {
                    items.push({ type: 'separator' }, petsMenu);
                }

                $menu.menu('option', 'items', items);
            };

            tryAddItem();
        }

        loadPets() {
            const config = Storage.getConfig();

            Object.keys(PET_TYPES).forEach(animal => {
                const quantity = config[animal] || 0;
                if (quantity > 0) {
                    /* Warm the cache for every animation before pets appear */
                    preloadGifs(animal);
                }
                for (let i = 0; i < quantity; i++) {
                    const pet = new ApexPet(animal);
                    this.container.appendChild(pet.el);
                    this.pets.push(pet);
                }
            });
        }

        refreshPets() {
            /* Remove all pets */
            this.pets.forEach(pet => pet.remove());
            this.pets = [];

            /* Reload pets with new config */
            this.loadPets();
        }

        startAnimation() {
            /* vscode-pets ticks its state machine every 100ms */
            this.tickTimer = setInterval(() => {
                this.pets.forEach(pet => pet.nextFrame());
            }, PET_CONFIG.tickMs);
        }

        destroy() {
            if (this.tickTimer) {
                clearInterval(this.tickTimer);
            }
            this.pets.forEach(pet => pet.remove());
            if (activeBall) {
                activeBall.remove();
                activeBall = null;
            }
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
        }
    }

    /* Initialize when DOM is ready */
    const petManager = new PetManager();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => petManager.init());
    } else {
        petManager.init();
    }

    /* Cleanup on page unload */
    window.addEventListener('beforeunload', () => petManager.destroy());
})();
