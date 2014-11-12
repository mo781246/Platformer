window.addEventListener("load",function() {

var Q = window.Q = Quintus({audioSupported: [ 'wav','mp3','ogg' ]})
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio")
        // Maximize this game to whatever the size of the browser is
        .setup({ maximize: true })
        // And turn on default input controls and touch input (for UI)
        .controls(true).touch()
        // Enable sounds.
        .enableSound();


Q.SPRITE_PLAYER = 1;
Q.SPRITE_COLLECTABLE = 2;
Q.SPRITE_ENEMY = 4;
Q.SPRITE_DOOR = 8;
Q.SPRITE_PLATFORM = 16;
Q.Sprite.extend("Player",{

  init: function(p) {

    this._super(p, {
      sheet: "player",  
      sprite: "player",
      direction: "right",
      jumpSpeed: -275,
      speed: 150,
      strength: 100,
      score: 0,
	  time: 180,
      type: Q.SPRITE_PLAYER,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_DOOR | Q.SPRITE_COLLECTABLE | Q.SPRITE_PLATFORM
    });


    this.add('2d, platformerControls, animation, tween');

    this.on("bump.top","breakTile");

    this.on("sensor.tile","checkLadder");
    this.on("enemy.hit","enemyHit");
    this.on("jump");
    this.on("jumped");

    Q.input.on("down",this,"checkDoor");
  },

  jump: function(obj) {
    // Only play sound once.
    if (!obj.p.playedJump) {
      Q.audio.play('jump.mp3');
      obj.p.playedJump = true;
    }
  },

  jumped: function(obj) {
    obj.p.playedJump = false;
  },

  checkLadder: function(colObj) {
    if(colObj.p.ladder) { 
      this.p.onLadder = true;
      this.p.ladderX = colObj.p.x;
    }
  },

  checkDoor: function() {
    this.p.checkDoor = true;
  },

  resetLevel: function() {
    Q.stageScene("level3");
    this.p.strength = 100;
	this.p.score = 0;
    this.animate({opacity: 1});
    Q.stageScene('hud', 3, this.p);
  },

  enemyHit: function(data) {
    var col = data.col;
    var enemy = data.enemy;
    this.p.vy = -150;
    if (col.normalX == 1) {
      // Hit from left.
      this.p.x -=15;
      this.p.y -=15;
    }
    else {
      // Hit from right;
      this.p.x +=15;
      this.p.y -=15;
    }
    this.p.immune = true;
    this.p.immuneTimer = 0;
    this.p.immuneOpacity = 1;
    this.p.strength -= 25;
    var sLabel = Q("UI.Text", 3).items[1];
	 sLabel.p.label = "Health: " + this.p.strength;
    if (this.p.strength == 0) {
      Q.stageScene('gameOver');
    }
  },

  continueOverSensor: function() {
    this.p.vy = 0;
    if(this.p.vx != 0) {
      this.play("walk_" + this.p.direction);
    } else {
      this.play("stand_" + this.p.direction);
    }
  },

  breakTile: function(col) {
    if(col.obj.isA("TileLayer")) {
      if(col.tile == 24) { col.obj.setTile(col.tileX,col.tileY, 36); }
      else if(col.tile == 36) { col.obj.setTile(col.tileX,col.tileY, 24); }
    }
    //Q.audio.play('coin.mp3');
  },

  step: function(dt) {
    var processed = false;
    if (this.p.immune) {
      // Swing the sprite opacity between 50 and 100% percent when immune.
      if ((this.p.immuneTimer % 12) == 0) {
        var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
        this.animate({"opacity":opacity}, 0);
        this.p.immuneOpacity = opacity;
      }
      this.p.immuneTimer++;
      if (this.p.immuneTimer > 144) {
        // 3 seconds expired, remove immunity.
        this.p.immune = false;
        this.animate({"opacity": 1}, 1);
      }
    }

    if(this.p.onLadder) {
      this.p.gravity = 0;

      if(Q.inputs['up']) {
        this.p.vy = -this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else if(Q.inputs['down']) {
        this.p.vy = this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else {
        this.continueOverSensor();
      }
      processed = true;
    } 
      
    if(!processed && this.p.door) {
      this.p.gravity = 1;
      if(this.p.checkDoor && this.p.landed > 0) {
        // Enter door.
        this.p.y = this.p.door.p.y;
        this.p.x = this.p.door.p.x;
        this.play('climb');
        this.p.toDoor = this.p.door.findLinkedDoor();
        processed = true;
      }
      else if (this.p.toDoor) {
        // Transport to matching door.
        this.p.y = this.p.toDoor.p.y;
        this.p.x = this.p.toDoor.p.x;
        this.stage.centerOn(this.p.x, this.p.y);
        this.p.toDoor = false;
        this.stage.follow(this);
        processed = true;
      }
    } 
      
    if(!processed) { 
      this.p.gravity = 1;

      if(Q.inputs['down'] && !this.p.door) {
        this.p.ignoreControls = true;
        this.play("duck_" + this.p.direction);
        if(this.p.landed > 0) {
          this.p.vx = this.p.vx * (1 - dt*2);
        }
       // this.p.points = this.p.duckingPoints;
      } else {
        this.p.ignoreControls = false;
       // this.p.points = this.p.standingPoints;

        if(this.p.vx > 0) {
          if(this.p.landed > 0) {
            this.play("walk_right");
          } else {
            this.play("jump_right");
          }
          this.p.direction = "right";
        } else if(this.p.vx < 0) {
          if(this.p.landed > 0) {
            this.play("walk_left");
          } else {
            this.play("jump_left");
          }
          this.p.direction = "left";
        } else {
          this.play("stand_" + this.p.direction);
        }
           
      }
    }

    this.p.onLadder = false;
    this.p.door = false;
    this.p.checkDoor = false;


    if(this.p.y > 500) {
      this.stage.unfollow();
    }

    if(this.p.y > 750) {
      Q.stageScene('gameOver');
    }
	
	if(this.p.x >= 2267.83 && this.p.y >= 110.166) {
		Q.stageScene('win');
		}
  }
});


Q.Sprite.extend("Enemy", {
  init: function(p,defaults) {

    this._super(p,Q._defaults(defaults||{},{
      sheet: p.sprite,
      vx: 10,
      defaultDirection: 'left',
      type: Q.SPRITE_ENEMY,
      collisionMask: Q.SPRITE_DEFAULT
    }));

    this.add("2d, aiBounce, animation");
    this.on("bump.top",this,"die");
    this.on("hit.sprite",this,"hit");
  },

  step: function(dt) {
    if(this.p.dead) {
      this.del('2d, aiBounce');
      this.p.deadTimer++;
      if (this.p.deadTimer > 24) {
        // Dead for 24 frames, remove it.
        this.destroy();
      }
      return;
    }
    var p = this.p;

    p.vx += p.ax * dt;
    p.vy += p.ay * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    this.play('walk');
  },

  hit: function(col) {
    if(col.obj.isA("Player") && !col.obj.p.immune && !this.p.dead) {
      col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
      Q.audio.play('hit.mp3');
    }
  },

  die: function(col) {
    if(col.obj.isA("Player")) {
      Q.audio.play('coin.mp3');
      this.p.vx=this.p.vy=0;
      this.play('dead');
      this.p.dead = true;
      var that = this;
      col.obj.p.vy = -300;
      this.p.deadTimer = 0;
    }
  }
});


Q.Enemy.extend("Slime", {
  init: function(p) {
    this._super(p,{
      w: 29,
      h: 16
    });
  }
});


Q.Sprite.extend("Collectable", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_PLAYER,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },

  // When a Collectable is hit.
  sensor: function(colObj) {
    // Increment the score.
    if (this.p.amount) {
      colObj.p.score += this.p.amount;
       var coinLabel = Q("UI.Text", 3).items[0];
	 coinLabel.p.label = "Score: " + colObj.p.score;
    }

    if(colObj.p.score == 100){
      Q.stageScene("win");
    }
    Q.audio.play('coin.mp3');
    this.destroy();
  }
});

Q.Sprite.extend("Door", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_DOOR,
      collisionMask: Q.SPRITE_NONE,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },
  findLinkedDoor: function() {
    return this.stage.find(this.p.link);
  },
  // When the player is in the door.
  sensor: function(colObj) {
    // Mark the door object on the player.
    colObj.p.door = this;
  }
});

Q.Sprite.extend("Platform", {
	init: function(p) {
		this._super(p,{
		sheet: p.sprite,
		type: Q.SPRITE_PLATFORM,
		collisionMask: Q.SPRITE_DEFAULT,
		vx: 20,
		vy: 0,
		start: p.x,
		gravity: 0
	});
	},
	
	step: function(dt) {
	 var p = this.p;
	  
	 p.x += p.vx * dt;
	 
	 if(p.x > p.start + 130) {
		p.vx = -p.vx;
		}
		else if(p.x < p.start) {
			p.vx = -p.vx;
			}
	
	},
	});
	

Q.Platform.extend("Platform2", {
  init: function(p) {
    this._super(p,{
    });
	this.p.vx = -20;
  }
});	


 Q.scene('title', function(stage) {
    var container = stage.insert(new Q.UI.Container({
      fill: "#3E3869",
      border: 5,
      x: Q.width/2,
      y: Q.height/2 -50,
    }));
    
      stage.insert(new Q.UI.Text({ 
      label: "Forest\nPlatformer",
      color: "white",
      align: 'center',
      x: 0,
      y: -200,
      size: 50
    }),container);

     stage.insert(new Q.UI.Text({
      color: "white",
      label: "Team F:\nEric Iannacone, Mark Ottenberg, Josh Tate ",
      align: 'center',
      x: 0,
      y: 20,
      weight: "normal",
      size: 25
    }),container);

    stage.insert(new Q.UI.Text({
      color: "white",
      label: "Hit the spacebar to start",
      align: 'center',
      x: 0,
      y: 150,
      weight: "normal",
      size: 20
    }),container);
    
    
    stage.insert(new Q.UI.Text({
      color: "white",
      label: "During the game:\n L/R arrows to move the player \n U/D arrows to jump and climb",
      align: 'center',
      x: 0,
      y: 250,
      weight: "normal",
      size: 20
    }),container);  
    
    container.fit(125,50);

Q.input.on('fire',function() {
    Q.stageScene("level3");
    Q.stageScene('hud', 3, Q('Player').first().p);
  });
  });

 Q.scene('gameOver', function(stage) {
    var container = stage.insert(new Q.UI.Container({
      fill: "#3E3869",
      border: 5,
      x: Q.width/2,
      y: Q.height/2 -50,
    }));
    
      stage.insert(new Q.UI.Text({ 
      label: "You Lose!",
      color: "white",
      align: 'center',
      x: 0,
      y: -100,
      size: 50
    }),container);

    stage.insert(new Q.UI.Text({
      color: "white",
      label: "Hit the spacebar to restart",
      align: 'center',
      x: 0,
      y: 50,
      weight: "normal",
      size: 20
    }),container);
    
    container.fit(50,50);

Q.input.on('fire',function() {
    Q.clearStages();
    Q.stageScene("level3");
    Q.stageScene('hud', 3, Q('Player').first().p);
  });
  });

  Q.scene('win', function(stage) {
    var container = stage.insert(new Q.UI.Container({
      fill: "#3E3869",
      border: 5,
      x: Q.width/2,
      y: Q.height/2 -50,
    }));
    
      stage.insert(new Q.UI.Text({ 
      label: "You Win!",
      color: "white",
      align: 'center',
      x: 0,
      y: -100,
      size: 50
    }),container);

    stage.insert(new Q.UI.Text({
      color: "white",
      label: "Hit the spacebar to restart",
      align: 'center',
      x: 0,
      y: 50,
      weight: "normal",
      size: 20
    }),container);
    
    container.fit(50,50);

Q.input.on('fire',function() {
    Q.stageScene("level3");
    Q.stageScene('hud', 3, Q('Player').first().p);
  });
  });


Q.scene("level3",function(stage) {
  Q.stageTMX("level3.tmx", stage);

  stage.add("viewport").follow(Q("Player").first());
  stage.viewport.scale = 3;
});


Q.scene('hud',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: 50, y: 0
  }));

  var label = container.insert(new Q.UI.Text({x:250, y: 20,
    label: "Score: " + stage.options.score, color: "white" }));

  var strength = container.insert(new Q.UI.Text({x:50, y: 20,
    label: "Health: " + stage.options.strength + '%', color: "white" }));

  container.fit(20);
});

Q.loadTMX("level3.tmx, collectables.png, collectables.json, enemies.png, enemies.json, doors.png, doors.json, fire.mp3, jump.mp3, heart.mp3, hit.mp3, coin.mp3, player.json, player.png, rupee.png, rupee.json, platform.png, platform.json", function() {
    Q.compileSheets("player.png","player.json");
    Q.compileSheets("collectables.png","collectables.json");
    Q.compileSheets("enemies.png","enemies.json");
    Q.compileSheets("doors.png","doors.json");
	Q.compileSheets("rupee.png","rupee.json");
	Q.compileSheets("platform.png","platform.json")
    Q.animations("player", {
      walk_right: { frames: [0,2,3,1], rate: 1/6, flip: false, loop: true },
      walk_left: { frames:  [0,2,3,1], rate: 1/6, flip:"x", loop: true },
      jump_right: { frames: [5], rate: 1/3, flip: false },
      jump_left: { frames:  [5], rate: 1/3, flip: "x" },
      stand_right: { frames:[0], rate: 1/10, flip: false },
      stand_left: { frames: [0], rate: 1/10, flip:"x" },
      duck_right: { frames: [4], rate: 1/10, flip: false },
      duck_left: { frames:  [4], rate: 1/10, flip: "x" },
      climb: { frames:  [11, 12, 13, 14, 15], rate: 1/3, flip: false }
    });
   var EnemyAnimations = {
      walk: { frames: [0], rate: 1/2, loop: false },
      dead: { frames: [2], rate: 1/10 }
    };
    Q.animations("slime", EnemyAnimations);

    //Q.stageScene('title');
    Q.stageScene('title');
  
}, {
  progressCallback: function(loaded,total) {
    var element = document.getElementById("loading_progress");
    element.style.width = Math.floor(loaded/total*100) + "%";
    if (loaded == total) {
      document.getElementById("loading").remove();
    }
  }
});

});
