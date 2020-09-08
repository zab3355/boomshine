// main.js
// Dependencies:
// Description: singleton object
// This object will be our main "controller" class and will contain references
// to most of the other objects in the game.

"use strict";

// if app exists use the existing copy
// else create a new object literal
var app = app || {};

/*
 .main is an object literal that is a property of the app global
 This object literal has its own properties and methods (functions)

 */
app.main = {
  //  properties
    WIDTH : 640,
    HEIGHT: 480,
    canvas: undefined,
    ctx: undefined,
    lastTime: 0, // used by calculateDeltaTime()
    debug: true,
    gameState : undefined,
    roundScore : 0,
    totalScore : 0,
    currentGoalScore : 0,


    // Part I - #1
    CIRCLE: Object.freeze({
      NUM_CIRCLES_START: 5,
      NUM_CIRCLES_END : 25,
      START_RADIUS : 14,
      MAX_RADIUS : 45,
      MIN_RADIUS : 2,
      MAX_LIFETIME : 2.5,
      MAX_SPEED : 80,
      EXPLOSION_SPEED : 60,
      IMPLOSION_SPEED : 84,
      PERCENT_CIRCLES_TO_ADVANCE : .6,
      NUM_LEVEL_INCREASE : 5,
    }),
    CIRCLE_STATE:Object.freeze({
      NORMAL:0,
      EXPLODING: 1,
      MAX_SIZE: 2,
      IMPLODING: 3,
      DONE: 4
    }),
    // Part I - #2
    GAME_STATE: Object.freeze({ // another fake enumeration
      BEGIN : 0,
      DEFAULT : 1,
      EXPLODING : 2,
      ROUND_OVER : 3,
      REPEAT_LEVEL : 4,
      END : 5,
      TITLE : 6,
    }),

    circles:[],
    numCircles: this.NUM_CIRCLES_START,
    paused: false,
    animationID: 0,

    // Part I - #4A
    // original 8 fluorescent crayons: https://en.wikipedia.org/wiki/List_of_Crayola_crayon_colors#Fluorescent_crayons
    //  "Ultra Red", "Ultra Orange", "Ultra Yellow","Chartreuse","Ultra Green","Ultra Blue","Ultra Pink","Hot Magenta"
    colors: ["#FD5B78","#FF6037","#FF9966","#FFFF66","#66FF66","#50BFE6","#FF6EFF","#EE34D2"],
    effectSounds:["1.mp3","2.mp3","3.mp3","4.mp3","5.mp3","6.mp3","7.mp3","8.mp3"],

    bgAudio: undefined,
    currentEffect: 0,
    currentDirection: 1,

    sound : undefined, // required - loaded by main.js

    // methods
  init : function() {
    console.log("app.main.init() called");
    // initialize properties
    this.canvas = document.querySelector('canvas');
    this.canvas.width = this.WIDTH;
    this.canvas.height = this.HEIGHT;
    this.ctx = this.canvas.getContext('2d');

    this.numCircles = this.CIRCLE.NUM_CIRCLES_START;
    this.circles = this.makeCircles(this.numCircles);
    console.log("this.circles = " + this.circles);

    //this.gameState = this.GAME_STATE.BEGIN;
    this.gameState = this.GAME_STATE.TITLE;

    // Hook up events
    this.canvas.onmousedown=this.doMousedown.bind(this);

    // Setup background audio
    this.bgAudio  = document.querySelector("#bgAudio");
    this.bgAudio.volume = 0.25;

    // load level
    this.reset();

    // start the game loop
    this.update();
  },

  stopBGAudio: function(){
    // this.bgAudio.pause(); // OLD
    // this.bgAudio.currentTime = 0; // OLD
    this.sound.stopBGAudio();
  },

  reset: function() {
    this.roundScore = 0;
    
    if(this.gameState != this.GAME_STATE.REPEAT_LEVEL){
      this.numCircles += this.CIRCLE.NUM_LEVEL_INCREASE;
      this.currentGoalScore = Math.floor(this.numCircles * this.CIRCLE.PERCENT_CIRCLES_TO_ADVANCE);      
    }else{
     this.gameState = this.GAME_STATE.DEFAULT;

      console.log("rep[eat the level!");
    }

    // Check if we have hit the max number of circles here. If so, the game is over
    if(this.numCircles >= this.CIRCLE.NUM_CIRCLES_END) {
      console.log("GAME OVER in resetMethod");
      // instead of continueing, we will end the game here
      this.gameState = this.GAME_STATE.END;
      this.restartGame();
      return;
    }

    this.circles = this.makeCircles(this.numCircles);
    
  },

  restartGame: function(){
    this.numCircles = this.CIRCLE.NUM_CIRCLES_START;
    this.totalScore = 0,
    this.gameState = this.GAME_STATE.TITLE;

    // load level
    this.reset();

    // start the game loop
    //this.update();
    console.log("Restart the game!");
  },

  pauseGame: function(){
    this.paused = true;

    //stop the animation loop
    cancelAnimationFrame(this.animationID);

    // Call update() once so that our paused screen gets drawn
    this.update();
    this.stopBGAudio();

  },

  resumeGame: function(){
    cancelAnimationFrame(this.animationID);

    this.paused = false;

    this.update();
    this.sound.playBGAudio();
  },

  toggleDebug: function(){
    this.debug = !this.debug;
  },

  update: function(){
    // 1) LOOP
    // schedule a call to update()
    //requestAnimationFrame(function(){app.main.update()});
    this.animationID = requestAnimationFrame(this.update.bind(this));

    // 2) PAUSED?
    // if so, bail out of loop
    if(this.paused) {
      this.drawPauseScreen(this.ctx);
      return;
    }

    //Press shift to start gamestate
    if(this.gameState == this.GAME_STATE.TITLE){
      if(myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT]){
        this.gameState = this.GAME_STATE.BEGIN;
        console.log("START GAME");
      }
      else {
          this.drawtitleScreen(this.ctx);
          return;
      }
    }

    // 3) HOW MUCH TIME HAS GONE BY?
    var dt = this.calculateDeltaTime();

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillStyle = '#000000';

    this.ctx.fillRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
    // 5) DRAW
    // i) draw background
    this.ctx.globalAlpha = 0.9; // new
    this.drawCircles(this.ctx);
    this.moveCircles(dt);
    this.checkForCollisions();

    // iii) draw HUD
    this.ctx.globalAlpha = 1.0;
    this.drawHUD(this.ctx);

    // iv) draw debug info
    if (this.debug){
      // draw dt in bottom right corner
      this.fillText(this.ctx,"dt: " + dt.toFixed(3), this.WIDTH - 150, this.HEIGHT - 10, "18pt courier", "white");
    }

    // 6 Check for cheats!
    if(this.gameState == this.GAME_STATE.BEGIN || this.gameState == this.GAME_STATE.ROUND_OVER) {
      // if the shift key anbd up arrow are both down (true)
      if(myKeys.keydown[myKeys.KEYBOARD.KEY_UP] && myKeys.keydown[myKeys.KEYBOARD.KEY_SHIFT] ){
        this.totalScore++;
        this.sound.playEffect();
      }
    }

  },
  
  // Part III - #1// Part III - #1
  playEffect: function () {
    var effectSound = document.createElement('audio');
    effectSound.volume = 0.3;
    effectSound.src = "media/" + this.effectSounds[this.currentEffect];
    effectSound.play();

    this.currentEffect += this.currentDirection;
    if(this.currentEffect == this.effectSounds.length || this.currentEffect == -1){
      this.currentDirection *=-1;
      this.currentEffect += this.currentDirection;
    }
  },

  checkForCollisions: function(){
      if(this.gameState == this.GAME_STATE.EXPLODING){
        // check for collisions between circles
        for(var i=0;i<this.circles.length; i++){
          var c1 = this.circles[i];
          if (c1.state === this.CIRCLE_STATE.NORMAL) continue;
          if (c1.state === this.CIRCLE_STATE.DONE) continue;
          for(var j=0;j<this.circles.length; j++){
            var c2 = this.circles[j];
          // don't check for collisions if c2 is the same circle
            if (c1 === c2) continue;
          // don't check for collisions if c2 is already exploding
            if (c2.state != this.CIRCLE_STATE.NORMAL ) continue;
            if (c2.state === this.CIRCLE_STATE.DONE) continue;

            // Now you finally can check for a collision
            if(circlesIntersect(c1,c2) ){
              c2.state = this.CIRCLE_STATE.EXPLODING;
              c2.xSpeed = c2.ySpeed = 0;
              this.roundScore ++;
              this.sound.playEffect();
            }
          }
        } // end for

        // round over?
        var isOver = true;
        for(var i = 0; i < this.circles.length; i++){
          var c = this.circles[i];
          if(c.state != this.CIRCLE_STATE.NORMAL && c.state != this.CIRCLE_STATE.DONE) {
           isOver = false;
           break;
          }
        } // end for

        if(isOver) {
          // If that round was the last round. It is the last round when
          // we reached the end number of balls
          // IF WE HAVE REACHED THE PROPER SCORE
          if(this.roundScore >= this.currentGoalScore)
          {
            this.gameState = this.GAME_STATE.ROUND_OVER;

          }
          else{
            // The player has failed and must play again
            this.gameState = this.GAME_STATE.REPEAT_LEVEL;
          }
          console.log("set the game state to ROUND_OVER");
          
          this.totalScore += this.roundScore;
          this.stopBGAudio();
          // if the number of circles was the max go right to the game over screen
         }

      } // end if GAME_STATE_EXPLODING
    },


  drawHUD: function(ctx) {
      ctx.save(); // NEW
      // draw score
          // fillText(string, x, y, css, color)
      this.fillText(this.ctx, "This Round: " + this.roundScore + " of " + this.numCircles, 20, 20, "14pt courier", "#ddd");
      this.fillText(this.ctx, "Minimum to next round: " + 
      this.currentGoalScore,
       20, 40, "14pt courier", "#ddd");

      this.fillText(this.ctx,"Total Score: " + this.totalScore, this.WIDTH - 200, 20, "14pt courier", "#ddd");

      // NEW
      if(this.gameState == this.GAME_STATE.BEGIN){
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        this.fillText(this.ctx,"To begin, click a circle", this.WIDTH/2, this.HEIGHT/2, "30pt courier", "white");
      } // end if

      if(this.gameState == this.GAME_STATE.REPEAT_LEVEL){
        ctx.save();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';

        ctx.fillRect(0,0,this.WIDTH,this.HEIGHT);

        this.fillText(this.ctx,"Round Over, you did NOT pass", this.WIDTH/2, this.HEIGHT/2 - 50, "16pt courier", "white");
        this.fillText(this.ctx,"Click to continue", this.WIDTH/2, this.HEIGHT/2, "32pt courier", "red");
        this.fillText(this.ctx,"Scored "+ this.roundScore + " of " + this.currentGoalScore, this.WIDTH/2, this.HEIGHT/2 + 50, "16pt courier", "white");
        ctx.restore(); // NEW
      }

      // NEW
      if(this.gameState == this.GAME_STATE.ROUND_OVER) {
        
        // debugger;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';

        ctx.fillRect(0,0,this.WIDTH,this.HEIGHT);

        this.fillText(this.ctx,"Click to continue", this.WIDTH/2, this.HEIGHT/2, "30pt courier", "red");
        // Only draw how many balls there are next round if the game is not gonna be over when it happens
        if(this.numCircles + this.CIRCLE.NUM_LEVEL_INCREASE < this.CIRCLE.NUM_CIRCLES_END) {
          this.fillText(this.ctx,"Round Over", this.WIDTH/2, this.HEIGHT/2 - 40, "30pt courier", "red");
          this.fillText(this.ctx,"Next round there are " + (this.numCircles + 5) + " circles", this.WIDTH/2 , this.HEIGHT/2 + 35, "20pt courier", "#ddd");
        }
        else{
          // draw the game over screen
          //ctx.fillStyle = "black";
          //ctx.fillRect(0,0,this.WIDTH, this.HEIGHT);
          this.fillText(this.ctx,"Game Over", this.WIDTH/2, this.HEIGHT/2 - 50, "32pt courier", "red");
          this.fillText(this.ctx, "Total Score: " + this.totalScore,this.WIDTH/2, this.HEIGHT / 2 + 100, "20pt courier", "white");
        }
      } // end if

      ctx.restore(); // NEW
    },

  drawtitleScreen: function(ctx){
      ctx.save();
      ctx.fillStyle = "black";
      ctx.fillRect(0,0,this.WIDTH, this.HEIGHT);
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      this.fillText(this.ctx,"Welcome to Boomshine", this.WIDTH/2, this.HEIGHT/2, "32pt courier", "white");
      this.fillText(this.ctx,"Press Shift To Start", this.WIDTH/2, this.HEIGHT/2 + 50, "14pt courier", "white");
      ctx.restore();
    },

  drawPauseScreen: function(ctx) {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,this.WIDTH, this.HEIGHT);
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    this.fillText(this.ctx,"...PAUSED...", this.WIDTH/2, this.HEIGHT/2, "40pt courier", "white");
    ctx.restore();
  },

  makeCircles: function(num) {
    var array = [];

    var circleMove = function(dt) {
      this.x += this.xSpeed * this.speed * dt;
      this.y += this.ySpeed * this.speed * dt;
    };

    var circleDraw = function(ctx){
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.fillStyle = this.fillStyle;

      ctx.fill();
      ctx.restore();
    };

    for(var i=0; i < num; i++) {
      var c = {};
      c.x = getRandom(this.CIRCLE.START_RADIUS * 2, this.WIDTH - this.CIRCLE.START_RADIUS * 2);
      c.y = getRandom(this.CIRCLE.START_RADIUS * 2, this.HEIGHT - this.CIRCLE.START_RADIUS * 2);

      c.radius = this.CIRCLE.START_RADIUS;

      var randomVector = getRandomUnitVector();
      c.xSpeed = randomVector.x;
      c.ySpeed = randomVector.y;

      // Make more properties
      c.speed = this.CIRCLE.MAX_SPEED;
      c.fillStyle = this.colors[i % this.colors.length];
      c.state = this.CIRCLE_STATE.NORMAL;
      c.lifetime = 0;

      c.draw = circleDraw;
      c.move = circleMove;

      Object.seal(c);
      array.push(c);

    }
    return array;
  },

  moveCircles: function(dt){
      for(var i=0;i<this.circles.length; i++){
        var c = this.circles[i];
        if(c.state === this.CIRCLE_STATE.DONE) continue;
        if(c.state === this.CIRCLE_STATE.EXPLODING){
          c.radius += this.CIRCLE.EXPLOSION_SPEED  * dt;
          if (c.radius >= this.CIRCLE.MAX_RADIUS){
            c.state = this.CIRCLE_STATE.MAX_SIZE;
          }
          continue;
        }

        if(c.state === this.CIRCLE_STATE.MAX_SIZE){
          c.lifetime += dt; // lifetime is in seconds
          if (c.lifetime >= this.CIRCLE.MAX_LIFETIME){
            c.state = this.CIRCLE_STATE.IMPLODING;
          }
          continue;
        }

        if(c.state === this.CIRCLE_STATE.IMPLODING){
          c.radius -= this.CIRCLE.IMPLOSION_SPEED * dt;
          if (c.radius <= this.CIRCLE.MIN_RADIUS){
            c.state = this.CIRCLE_STATE.DONE;
            continue;
          }

        }

        // move circles
        c.move(dt);

        // did circles leave screen?
        if(this.circleHitLeftRight(c)) {
          c.xSpeed *= -1;
          c.move(dt);
        }

        if(this.circleHitTopBottom(c)) {
          c.ySpeed *= -1;
          c.move(dt);
        }

      } // end for loop
    },

  drawCircles: function(ctx){
    for(var i=0; i< this.circles.length; i++){
      var c = this.circles[i];
      if(c.state === this.CIRCLE_STATE.DONE) continue;
      c.draw(ctx);
    }
  },

  circleHitLeftRight: function(c){
    if(c.x <= c.radius || c.x >= this.WIDTH - c.radius){
      return true;
    }
  },

  circleHitTopBottom: function(c) {
    if(c.y <= c.radius || c.y >= this.HEIGHT - c.radius){
      return true;
    }
  },

  fillText: function(ctx, string, x, y, css, color) {
    ctx.save();
    // https://developer.mozilla.org/en-US/docs/Web/CSS/font
    ctx.font = css;
    ctx.fillStyle = color;
    ctx.fillText(string, x, y);
    ctx.restore();
  },

  calculateDeltaTime: function(){
    var now,fps;
    now = performance.now();
    fps = 1000 / (now - this.lastTime);
    fps = clamp(fps, 12, 60);
    this.lastTime = now;
    return 1/fps;
  },

  doMousedown: function(e){
    if(this.paused) {
      this.paused = false;
      this.update();
      return;
    }

    if(this.gameState == this.GAME_STATE.EXPLODING ||        
       this.gameState == this.GAME_STATE.TITLE) return;

    if(this.gameState == this.GAME_STATE.END) {
      this.restartGame();
      return;
    }
    if(this.gameState == this.GAME_STATE.REPEAT_LEVEL){
      this.totalScore -= this.roundScore;

      this.reset();
      return;
    }

    if(this.gameState == this.GAME_STATE.ROUND_OVER) {
        this.gameState = this.GAME_STATE.DEFAULT;
        this.reset();
        return;
    }

    this.sound.playBGAudio();

    var mouse = getMouse(e);
    this.checkCircleClicked(mouse);
  },

  checkCircleClicked:function(mouse){
    //loopingthroughcirclearraybackwards,why?
    for(var i=this.circles.length-1;i>=0;i--){
      var c=this.circles[i];

      if(pointInsideCircle(mouse.x,mouse.y,c)){
        c.xSpeed = c.ySpeed = 0;
        c.state = this.CIRCLE_STATE.EXPLODING;
        this.gameState = this.GAME_STATE.EXPLODING;
        this.roundScore++;
        this.sound.playEffect();
        break; // Exit the for, we just want to click one circle
      }
    }
  },

}; // end app.main