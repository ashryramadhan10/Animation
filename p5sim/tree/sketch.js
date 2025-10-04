let tree;

function setup() {
    createCanvas(500, 500);
    background(127);
    angleMode(RADIANS);
    tree = new BST();

}

function draw() {
    background(127);

    tree.insert(10);
    tree.insert(5);
    tree.insert(17);
    tree.insert(3);
    tree.insert(7);
    tree.insert(15);
    tree.insert(1);
    tree.insert(4);
    tree.insert(6);
    tree.insert(8);
    tree.insert(11);
    tree.insert(16);
    tree.render(tree.root);

    console.log(tree);

    noLoop();
}