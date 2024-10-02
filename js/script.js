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
const brickSize = 32; // Assume the brick image is 32x32 pixels
let gameOver = false;


const game = new Phaser.Game(config);

function preload() {

    // Load the player sprite sheet with correct frame sizes
    this.load.spritesheet('player', '../img/hippo.png', {
        frameWidth: 64,  // Correct width of a single frame
        frameHeight: 64  // Correct height of a single frame
    });

    // load enemy
    this.load.image('enemy', '../img/copter.png');

    // Load the wall bricks
    this.load.image('brick', '../img/bricks.png');

        // Load the dead hippo sprite sheet
        this.load.spritesheet('deadHippo', '../img/deadHippo.png', {
            frameWidth: 64,  // Adjust the width based on the sprite sheet
            frameHeight: 64  // Adjust the height based on the sprite sheet
        });
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


    // Create the death animation from the "deadHippo" sprite sheet
    this.anims.create({
        key: 'death',
        frames: this.anims.generateFrameNumbers('deadHippo', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 2,  // Play the animation 3 times (0-based index, repeat twice)
        hideOnComplete: false  // Do not hide after completion
    });

    // Create maze walls using static physics group
    walls = this.physics.add.staticGroup();

    // Example maze layout (you can customize this)
    // Each 'wall' is represented as [x, y, width, height]
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

        // Draw walls as tiled bricks
        mazeLayout.forEach(([x, y, width, height]) => {
            createTiledWall(this, walls, x, y, width, height);
        });

    function createTiledWall(scene, wallGroup, startX, startY, width, height) {
        const bricksHorizontal = Math.ceil(width / brickSize);  // Number of bricks horizontally
        const bricksVertical = Math.ceil(height / brickSize);   // Number of bricks vertically
    
        // Create each brick tile
        for (let i = 0; i < bricksHorizontal; i++) {
            for (let j = 0; j < bricksVertical; j++) {
                const brickX = startX + i * brickSize;
                const brickY = startY + j * brickSize;
                const brick = wallGroup.create(brickX + brickSize / 2, brickY + brickSize / 2, 'brick');
                brick.setDisplaySize(brickSize, brickSize);  // Ensure the brick is correctly sized
                brick.setOrigin(0.5);  // Center the brick
                brick.refreshBody();   // Refresh physics body to account for its new size
            }
        }
    }

    // Create the player using the sprite sheet
    player = this.physics.add.sprite(120, 120, 'player');
    player.setDisplaySize(64, 64);  // Set the display size of the player
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
            Phaser.Math.Between(100, 620),
            Phaser.Math.Between(100, 380),
            'enemy'
        );
        enemy.setCollideWorldBounds(true);
        enemy.setVelocity(
            Phaser.Math.Between(-enemySpeed, enemySpeed),
            Phaser.Math.Between(-enemySpeed, enemySpeed)
        );
        enemy.setBounce(1);
        enemy.setDisplaySize(64, 64);  // Scale to 64x64 pixels

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

    // Arrow keys movement
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

// Function to handle when the player hits an enemy
function hitEnemy(player, enemy) {
    if (gameOver) return;  // Avoid multiple collisions triggering multiple restarts
    gameOver = true;

    // Stop player movement and play death animation
    player.setVelocity(0);
    player.anims.play('death');  // Play the death animation

    // When the death animation completes, pause for 2 seconds and then restart the game
    player.on('animationcomplete', function () {
        setTimeout(() => {
            this.scene.restart();  // Restart the scene after the delay
            gameOver = false;  // Reset game over state for the next round
        }, 2000);  // Pause for 2 seconds before restarting
    }, this);
}