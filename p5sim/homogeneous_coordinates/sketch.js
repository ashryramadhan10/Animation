class Rectangle {
  constructor(vertices) {
    this.vertices = [];
    for (let i = 0; i < vertices.length; i++) {
        this.vertices.push(vertices[i]);
    }
  }

  render() {
    beginShape();
    for (let i = 0; i < this.vertices.length; i++) {
        vertex(this.vertices[i].x, this.vertices[i].y);
    }
    endShape();
  }
}

let rect1;
let origin;

function setup() {
    createCanvas(500, 500);
    background(0);

    origin = createVector(width / 2, height / 2);

    let factor = 50;
    tl = createVector(width / 2 - factor, height / 2 - factor / 2);
    tr = createVector(width / 2 + factor, height / 2 - factor / 2);
    br = createVector(width / 2 + factor, height / 2 + factor / 2);
    bl = createVector(width / 2 - factor, height / 2 + factor / 2);
    let vertices = [tl, tr, br, bl];
    rect1 = new Rectangle(vertices);
}

function draw() {
    background(0);
    rect1.render();
    
    // h0 > 0 and h1 < 0 and |h0|>|h1|
    let pow = 3
    let h0 = 5 * (1/10**pow);
    let h1 = -2 * (1/10**pow);

    let b0 = 0;
    let b1 = 0;

    let hMat = [
        [1, 0, b0],
        [0, 1, b1],
        [h0, h1, 1]
    ]

    let resultMat = [];
    for (let v of rect1.vertices) {
        resultMat.push(applyHomographyToPoint(v, origin, hMat));
    }
    
    fill(0, 255, 0, 100);
    beginShape();
    for (let i = 0; i < resultMat.length; i++) {
        vertex(resultMat[i].x, resultMat[i].y);
    }
    endShape();

    // let matA = [
    //     [1, 0, 0],
    //     [0, 1, 0],
    //     [5, -2, 1]
    // ];

    // let matB = [200, 225, 1];
    // let matB_H = this.transposeMatrix(matB);

    // let resultMat = this.dotProductMatrix(matA, matB_H);
    // console.log(resultMat);
    // let cartMat = this.homogeneous2cartesian(resultMat);
    // console.log(cartMat);

    noLoop();
}

function applyHomographyToPoint(pt, origin, H) {
  // move point relative to origin
  let x = pt.x - origin.x;
  let y = pt.y - origin.y;

  // homogeneous coords
  let vec = [x, y, 1];
  let vecH = this.transposeMatrix(vec);
  let result = this.dotProductMatrix(H, vecH);

  // convert back to Cartesian
  let cart = this.homogeneous2cartesian(result);

  // move back to original reference
  return createVector(cart[0] + origin.x, cart[1] + origin.y);
}

function homogeneous2cartesian(vec) {
    let cartCoord = [];
    for (let i = 0; i < vec.length - 1; i++) {
        cartCoord.push(vec[i] / vec[2]);
    }
    return cartCoord;
}
function dotProductMatrix(matA, matB) {

    // if matA || matB empty
    if (matA.length <= 0 || matB <=0) {
        return -1;
    }

    // must have same matA cols & matB rows
    if (matA[0].length != matB.length) {
        return -1;
    }

    let resultMat = [];
    for (let row = 0; row < matA.length; row++) {
        resultMat[row] = [];
    }

    let row = 0;
    for (row = 0; row < matA.length; row++) {
        let col = 0;
        for (col = 0; col < matB[0].length; col++) {
            let sum = 0;
            for (let i = 0; i < matB.length; i++) { // row of matB
                sum += matA[row][i] * matB[i][col];
            }
            resultMat[row][col] = sum;
        }
    }

    return resultMat;
}

function transposeMatrix(vec) {
    let transposedVector = [];

    for (let i = 0; i < vec.length; i++) {
        transposedVector[i] = [vec[i]];
    }

    return transposedVector;
}