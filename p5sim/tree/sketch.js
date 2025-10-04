let tree;
let btnInsert;
let inputInsertValue;
let isAnimating = false;

let btnSearch;

function setup() {
    createCanvas(700, 700);
    background(255);
    angleMode(RADIANS);
    tree = new BST();

    inputInsertValue = createInput();
    inputInsertValue.position(width + 30, 0);

    btnInsert = createButton('insert');
    btnInsert.position(width + 30, 25);
    btnInsert.mousePressed(treeInsert);

    btnSearch = createButton('search');
    btnSearch.position(width + 80, 25);
    btnSearch.mousePressed(treeSearch);
    
    // Insert initial values once
    tree.insert(10);
    tree.insert(15);
    tree.insert(11);
    tree.insert(5);
    tree.insert(3);
    tree.insert(2);
    tree.insert(20);
    tree.insert(17);
    tree.insert(9);
    tree.insert(8);
    // tree.insert(7);
}

function draw() {
    background(255);
    
    if (tree.root) {
        isAnimating = tree.update(); // update incremently with lerp
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

function treeSearch() {
    let value = parseInt(inputInsertValue.value());
    if (!isNaN(value)) {
        tree.search(value);
        isAnimating = true;
        loop();
        inputInsertValue.value('');
        tree.searchPaths = [];
    }
}