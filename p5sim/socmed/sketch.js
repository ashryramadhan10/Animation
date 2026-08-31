let files = [
  "socmed/images/1.png",
  "socmed/images/3.jpg",
  "socmed/images/4.jpg",
  "socmed/images/5.jpg",
  "socmed/images/6.jpg",
  "socmed/images/7.jpg",
  "socmed/images/8.jpg",
  "socmed/images/9.jpg",
  "socmed/images/10.jpg",
  "socmed/images/11.jpg",
  "socmed/images/12.jpg",
];

let imgs = [];
let normalized = [];

const CANVAS_W = 1080;
const CANVAS_H = 1920;

const NORMAL_W = 540;
const NORMAL_H = 960;

const HOLD_FRAMES = 40;
const TRANSITION_FRAMES = 20;
const MAX_LEVEL = 5;

let level = 0;
let localFrame = 0;
let paused = false;

let levelImages = [];
let generatedLevel = -1;

let btn, chunks = [];
const fr = 30;


function preload() {
  for (let f of files) {
    imgs.push(loadImage(f));
  }
}


function setup() {

  createCanvas(CANVAS_W, CANVAS_H);

  for (let img of imgs) {

    normalized.push(
      normalizeImage(
        img,
        NORMAL_W,
        NORMAL_H,
        color(0)
      )
    );

  }

  generateLevelImages();

  frameRate(fr);

  btn = document.querySelector('button');
  btn.onclick = record;
}


function draw() {

  background(0);


  let currentGrid = pow(2, level);
  let nextGrid = pow(
    2,
    min(level + 1, MAX_LEVEL)
  );


  let transitionStart = HOLD_FRAMES;
  let transitionEnd =
    HOLD_FRAMES + TRANSITION_FRAMES;


  let transitioning =
    localFrame >= transitionStart &&
    localFrame < transitionEnd &&
    level < MAX_LEVEL;


  if (!transitioning) {

    drawGrid(currentGrid);

  } else {

    let t =
      (localFrame - transitionStart)
      / TRANSITION_FRAMES;


    t = easeInOutCubic(t);


    drawSplitTransition(
      currentGrid,
      nextGrid,
      t
    );

  }


  if (!paused) {

    localFrame++;


    if (
      localFrame >=
      HOLD_FRAMES + TRANSITION_FRAMES
    ) {

      localFrame = 0;


      if (level < MAX_LEVEL) {

        level++;

        generateLevelImages();

      }

    }

  }

}



// create shuffled image list for each level
function generateLevelImages() {

  let count =
    pow(2, level) *
    pow(2, level);


  levelImages = [];


  while (levelImages.length < count) {

    let copy = [...normalized];

    shuffle(copy);


    for (let img of copy) {

      levelImages.push(img);

      if (levelImages.length >= count)
        break;

    }

  }


  generatedLevel = level;
}



function drawGrid(gridSize) {


  let cellW = width / gridSize;
  let cellH = height / gridSize;


  let index = 0;


  for (let y = 0; y < gridSize; y++) {

    for (let x = 0; x < gridSize; x++) {


      image(
        levelImages[index],
        x * cellW,
        y * cellH,
        cellW,
        cellH
      );


      index++;

    }

  }

}



function drawSplitTransition(
  currentGrid,
  nextGrid,
  t
) {


  let parentW = width / currentGrid;
  let parentH = height / currentGrid;


  let childW = width / nextGrid;
  let childH = height / nextGrid;


  let index = 0;


  for (let py = 0; py < currentGrid; py++) {

    for (let px = 0; px < currentGrid; px++) {


      let img =
        levelImages[index];


      let parentX =
        px * parentW;

      let parentY =
        py * parentH;


      let children = [
        [0,0],
        [1,0],
        [0,1],
        [1,1]
      ];


      for (let c of children) {


        let cx =
          px * 2 + c[0];

        let cy =
          py * 2 + c[1];


        let targetX =
          cx * childW;

        let targetY =
          cy * childH;



        image(
          img,
          lerp(parentX,targetX,t),
          lerp(parentY,targetY,t),
          lerp(parentW,childW,t),
          lerp(parentH,childH,t)
        );

      }


      index++;

    }

  }

}



function easeInOutCubic(t) {

  return t < 0.5
    ? 4*t*t*t
    : 1 - pow(-2*t+2,3)/2;

}



function keyPressed() {

  if (key === ' ') {

    paused = !paused;

    return false;

  }

}



// contain + padding

function normalizeImage(
  img,
  targetW,
  targetH,
  bgColor
) {


  let g =
    createGraphics(
      targetW,
      targetH
    );


  g.background(bgColor);


  let scale =
    min(
      targetW / img.width,
      targetH / img.height
    );


  let w =
    img.width * scale;


  let h =
    img.height * scale;


  g.image(
    img,
    (targetW - w) / 2,
    (targetH - h) / 2,
    w,
    h
  );


  return g;

}