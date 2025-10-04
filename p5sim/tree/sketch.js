let tree;
let btnInsert;
let inputInsertValue;
let isAnimating = false;

function setup() {
    createCanvas(500, 500);
    angleMode(RADIANS);
    tree = new BST();

    inputInsertValue = createInput();
    inputInsertValue.position(0, height + 30);

    btnInsert = createButton('insert');
    btnInsert.position(0, height + 50);
    btnInsert.mousePressed(treeInsert);
    
    // Insert initial values once
    tree.insert(10);
}

function draw() {
    background(127);
    
    if (tree.root) {
        tree.update(); // update incremently with lerp
        tree.render(tree.root); // then render
    }
    
    if (!isAnimating) {
        noLoop();
    }
}

function treeInsert() {
    let value = parseInt(inputInsertValue.value());
    if (!isNaN(value)) {
        tree.insert(value);
        isAnimating = true;
        loop();
        inputInsertValue.value('');
    }
}