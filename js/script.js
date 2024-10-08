(function(){ //encapsulation
// ======================================
// GLOBALS
// ======================================
const config = {
    type: Phaser.AUTO,
    width: 1025,
    height: 775,
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

const game = new Phaser.Game(config); // init Game object
let player;
let cursors;
let enemies;
let walls; // Maze walls
const enemySpeed = 100;
const brickSize = 25; // Assume the brick image is 25x25 pixels
let gameOver = false;

// Define different enemy types with unique speeds and textures
const enemyTypes = [
    { key: 'gator', speed: 100 },   // Slow enemy
    { key: 'lion', speed: 200 },    // Medium-speed enemy
    { key: 'copter', speed: 300 }, // Fast enemy
];

// ======================================
// PRELOADING ASSETS
// ======================================
function preload() {
    
    // Load the wall bricks
    this.load.image('brick', '../img/bricks.png');

    // dots are alephium logos
    // Load the energy dot image
    this.load.image('energyDot', '../img/alephdot.png');


    // Load the player sprite sheet with correct frame sizes
    this.load.spritesheet('player', '../img/hippo.png', {
        frameWidth: 59,  // Correct width of a single frame
        frameHeight: 53  // Correct height of a single frame
    });

    // Load the dead hippo sprite sheet
    this.load.spritesheet('deadHippo', '../img/deadHippo.png', {
        frameWidth: 64,  // Adjust the width based on the sprite sheet
        frameHeight: 64  // Adjust the height based on the sprite sheet
    });

    // enemies
    this.load.spritesheet('copter', '../img/copter.png', {
        frameWidth: 101,
        frameHeight: 72
    });    
    this.load.spritesheet('gator', '../img/gator.png', {
        frameWidth: 80,
        frameHeight: 72
    });
    this.load.spritesheet('lion', '../img/lion.png', {
        frameWidth: 62,
        frameHeight: 72
    }); 
}

// ======================================
// CREATE / INIT
// ======================================
function create() {

    // read a file
         async function readFile(file, callback) {
            console.log('readFile...');
            var rawFile = new XMLHttpRequest();
            rawFile.overrideMimeType("application/json");
            rawFile.open("GET", file, true);
            rawFile.onreadystatechange = function() {
                if (rawFile.readyState === 4 && rawFile.status == "200") {
                    console.log('file loaded...');
                    callback(rawFile.responseText);
                }
            }
            rawFile.send(null);
        };


    // ----------------------------
    // PLAYFIELD
    // ----------------------------    
    // Create maze walls using static physics group
    walls = this.physics.add.staticGroup();
    // Example maze layout (you can customize this)
    // Each 'wall' is represented as [x, y, width, height]
    let mazeLayout;
    readFile('./js/levels.json', async function( data ) {
        let level = JSON.parse(data);
        mazeLayout = level.maze;
        // Draw walls as tiled bricks
        mazeLayout.forEach(([x, y, width, height]) => {
            createTiledWall(this, walls, x, y, width, height);
        });
    });

    // ----------------------------
    // ENERGYDOTS
    // ----------------------------    
    // Create energy dots group
    const energyDots = this.physics.add.staticGroup();

    // Define the size of the grid and spacing between dots
    const dotSpacing = 50;  // Distance between each dot
    const dotSize = 15;     // Size of each dot (adjust if necessary)

    // Create a grid of energy dots
    for (let x = 100; x < config.width - 100; x += dotSpacing) {
        for (let y = 100; y < config.height - 100; y += dotSpacing) {
            // Place the energy dot if it's not overlapping with walls
            const dot = energyDots.create(x, y, 'energyDot');
            dot.setDisplaySize(dotSize, dotSize);  // Adjust size if needed
            dot.refreshBody();
        }
    }



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


    // ----------------------------
    // PLAYER / SPRITE ANIMATIONS
    // ----------------------------
    // PLAYER ...
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
    // Create the player using the sprite sheet
    player = this.physics.add.sprite(120, 120, 'player');
    player.setDisplaySize(64, 64);  // Set the display size of the player
    player.setCollideWorldBounds(true);

    // Play the player animation if it exists
    if (this.anims.exists('move')) {
        player.play('move');  // Play the animation
    } else {
        console.error('Move animation failed to load.');
    }


    // --------------------------------
    // ENEMIES ...

    if ( !this.textures.exists('copter') || !this.textures.exists('gator') || !this.textures.exists('lion') ) {
        console.error('Enemy sprite sheet failed to load.');
        return;
    }

    // Create animations from the sprite sheet for the enemies
    this.anims.create({
        key: 'chopper',
        frames: this.anims.generateFrameNumbers('copter', { start: 0, end: 1 }),
        frameRate: 10,
        repeat: -1 // Loop the animation
    });
    this.anims.create({
        key: 'snap',
        frames: this.anims.generateFrameNumbers('gator', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1 // Loop the animation
    });
    this.anims.create({
        key: 'roar',
        frames: this.anims.generateFrameNumbers('lion', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1 // Loop the animation
    });


    // Create enemy group
    enemies = this.physics.add.group();

    // Add 5 enemies with random types and speeds
    for (let i = 0; i < 5; i++) {
        // Randomly select an enemy type
        const enemyType = Phaser.Math.RND.pick(enemyTypes);

        // Create an enemy with the selected type
        const enemy = enemies.create(
            Phaser.Math.Between(100, 924),
            Phaser.Math.Between(100, 668),
            enemyType.key
        );
        
        enemy.setCollideWorldBounds(true);
        
        // Set the velocity based on the selected enemy type's speed
        enemy.setVelocity(
            Phaser.Math.Between(-enemyType.speed, enemyType.speed),
            Phaser.Math.Between(-enemyType.speed, enemyType.speed)
        );
        
        enemy.setBounce(1);
        enemy.setDisplaySize(72, 72);  // Scale to 72x72 pixels
        
        // Store the enemy's speed for the hunting logic
        enemy.speed = enemyType.speed;

        // Play the corresponding animation for each enemy type
        if (enemyType.key === 'copter') {
            enemy.play('chopper');
        } else if (enemyType.key === 'gator') {
            enemy.play('snap');
        } else if (enemyType.key === 'lion') {
            enemy.play('roar');
        }
    }


    // ----------------------------
    // GAME CONTROL LISTENERS
    // ----------------------------
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


    // ----------------------------
    // SET UP COLLISION DETECTION 
    // COLLIDER OBJECTS
    // ----------------------------
    // Handle collision between player and energy dots
    this.physics.add.overlap(player, energyDots, collectDot, null, this);

    // Function to handle collecting dots
    function collectDot(player, dot) {
        dot.destroy();  // Remove the dot when collected
    }

    // Handle collision between player and enemies
    this.physics.add.collider(player, enemies, hitEnemy, null, this);

    // Handle collision between player and maze walls
    this.physics.add.collider(player, walls);

    // Handle enemies bouncing off walls
    this.physics.add.collider(enemies, walls);

} // end create()



// ======================================
// UPDATE 
// ======================================
function update() {
    if (gameOver) return;  // Don't allow movement after game over

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
        // Calculate distance between player and enemy
        const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
        
        // If the distance is within 300 pixels, hunt the player
        if (distance <= 300) {
            // Calculate the direction towards the player
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);

            // Set the enemy's velocity towards the player
            enemy.setVelocity(Math.cos(angle) * enemy.speed, Math.sin(angle) * enemy.speed);
        } else {
            // If not within range, continue normal random movement
            if (enemy.body.velocity.x === 0 && enemy.body.velocity.y === 0) {
                enemy.setVelocity(
                    Phaser.Math.Between(-enemy.speed, enemy.speed),
                    Phaser.Math.Between(-enemy.speed, enemy.speed)
                );
            }
        }
    });
}// end update()


// ======================================
// MISC FUNCTIONS 
// ======================================
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

})();
