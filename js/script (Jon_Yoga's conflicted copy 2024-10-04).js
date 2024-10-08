const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let player;
let cursors;
let enemies;
let walls; // Maze walls
const enemySpeed = 100;

const game = new Phaser.Game(config);

function preload() {
    // Load the player sprite sheet with correct frame sizes
    this.load.spritesheet('player', '../img/Hippo-Sprite.png', {
        frameWidth: 112,  // Correct width of a single frame
        frameHeight: 112  // Correct height of a single frame
    });

    // Load the enemy sprite
    this.load.image('enemy', '../img/Daco_1619862.png');
}

function create() {
    // Verify the sprite sheet is loaded
    if (!this.textures.exists('player')) {
        console.error('Player sprite sheet failed to load.');
        return;
    }

    // Create animations from the sprite sheet for the player
    this.anims.create({
        key: 'move',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1 // Loop the animation
    });

    // Create maze walls using static physics group
    walls = this.physics.add.staticGroup();

    // Complex maze layout with blue rectangles for walls
    const mazeLayout = [
        [50, 50, 924, 20],    // Top wall
        [50, 50, 20, 668],    // Left wall
        [954, 50, 20, 668],   // Right wall
        [50, 698, 924, 20],   // Bottom wall
        [200, 150, 20, 300],  // Vertical walls inside the maze
        [300, 150, 300, 20],  // Horizontal walls inside the maze
        [600, 150, 20, 400],
        [200, 450, 300, 20],
        [500, 350, 20, 250],
        [750, 350, 150, 20],
        [750, 500, 20, 150],
    ];

    // Draw walls with graphics and add to physics system
    const graphics = this.add.graphics({ fillStyle: { color: 0x0000ff } });
    mazeLayout.forEach(([x, y, width, height]) => {
        // Draw rectangle for the wall
        graphics.fillRect(x, y, width, height);
        const wall = walls.create(x + width / 2, y + height / 2, null);
        wall.displayWidth = width;
        wall.displayHeight = height;
        wall.refreshBody();
    });

    // Create the player using the sprite sheet
    player = this.physics.add.sprite(80, 80, 'player');
    player.setDisplaySize(50, 50);  // Set the display size of the player
    player.setCollideWorldBounds(true);

    // Play the walking animation if it exists
    if (this.anims.exists('move')) {
        player.play('move');  // Play the animation
    } else {
        console.error('Move animation failed to load.');
    }

    // Set up cursor keys (for arrow keys and numpad keys)
    cursors = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        numPadUp: Phaser.Input.Keyboard.KeyCodes.NUMPAD_EIGHT,
        numPadDown: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
        numPadLeft: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR,
        numPadRight: Phaser.Input.Keyboard.KeyCodes.NUMPAD_SIX
    });

    // Create enemy group
    enemies = this.physics.add.group();

    // Add 5 enemies
    for (let i = 0; i < 5; i++) {
        const enemy = enemies.create(
            Phaser.Math.Between(100, 924),
            Phaser.Math.Between(100, 668),
            'enemy'
        );
        enemy.setCollideWorldBounds(true);
        enemy.setVelocity(
            Phaser.Math.Between(-enemySpeed, enemySpeed),
            Phaser.Math.Between(-enemySpeed, enemySpeed)
        );
        enemy.setBounce(1);
    }

    // Handle collision between player and enemies
    this.physics.add.collider(player, enemies, hitEnemy, null, this);

    // Handle collision between player and maze walls
    this.physics.add.collider(player, walls);

    // Handle enemies bouncing off walls
    this.physics.add.collider(enemies, walls);
}

function update() {
    // Player movement
    player.setVelocity(0);

    // Arrow keys and numpad movement
    if (cursors.left.isDown || cursors.numPadLeft.isDown) {
        player.setVelocityX(-200);
    } else if (cursors.right.isDown || cursors.numPadRight.isDown) {
        player.setVelocityX(200);
    }

    if (cursors.up.isDown || cursors.numPadUp.isDown) {
        player.setVelocityY(-200);
    } else if (cursors.down.isDown || cursors.numPadDown.isDown) {
        player.setVelocityY(200);
    }

    // Enemy movement (bounce off walls)
    enemies.getChildren().forEach((enemy) => {
        if (enemy.body.velocity.x === 0) {
            enemy.setVelocityX(Phaser.Math.Between(-enemySpeed, enemySpeed));
        }
        if (enemy.body.velocity.y === 0) {
            enemy.setVelocityY(Phaser.Math.Between(-enemySpeed, enemySpeed));
        }
    });
}

function hitEnemy(player, enemy) {
    // Restart the game if player hits an enemy
    this.physics.pause();
    player.setTint(0xff0000);
    this.scene.restart();
}
