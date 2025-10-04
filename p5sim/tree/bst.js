class Node {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
        this.parent = null;
        this.height = 1;
        this.pos = createVector(0, 0);
        this.r = 30;
        this.level = 1;
    }
}

class BST {
    constructor() {
        this.root = null;
    }

    insert(value) {
        this.root = this.insertNode(this.root, null, value);
    }

    render(node) {

        if (node == null) {
            return;
        }

        // draw root
        if (node.parent == null) {
            fill(255, 100, 100);
            stroke(255);
            node.pos.x = width / 2;
            node.pos.y = 100;
            circle(node.pos.x, node.pos.y, node.r);
            fill(0);
            let textsize = 15;
            textSize(textsize);
            text(node.value, node.pos.x - (textsize / 2), node.pos.y);
            text("H" + node.height, node.pos.x - (textsize / 2), node.pos.y - node.r);
            text("L" + node.level, node.pos.x - (textsize / 2), node.pos.y + node.r);
        } else {

            let theta = 0;
            let decreaseVal = PI/12;
            if (node.value < node.parent.value) {
                theta = PI/2 + PI/4;

                if (node.level > 2) {
                    theta = PI/2 + PI/4 - ((node.level-2) * decreaseVal)
                }
            } else {
                theta = PI/4;

                if (node.level > 2) {
                    theta = PI/4 + ((node.level-2) * decreaseVal)
                }
            }

            node.pos.x = width / 2;
            node.pos.y = 100;
            let radius = 350 / node.level;
            node.pos.x = radius * cos(theta) + node.parent.pos.x;
            node.pos.y = radius * sin(theta) + node.parent.pos.y;
            stroke(0);
            line(node.parent.pos.x, node.parent.pos.y, node.pos.x, node.pos.y);
            fill(100, 255, 100);
            stroke(255);
            circle(node.pos.x, node.pos.y, node.r);
            fill(0);
            let textsize = 15;
            textSize(textsize);
            text(node.value, node.pos.x - (textsize / 2), node.pos.y);
            text("H" + node.height, node.pos.x - (textsize / 2), node.pos.y - node.r);
            text("L" + node.level, node.pos.x - (textsize / 2), node.pos.y + node.r);
        }

        this.render(node.left);
        this.render(node.right);
    }

    getHeight(node) {
        if (node == null) {
            return 0;
        }

        return node.height;
    }

    updateHeight(node) {
        return 1 + max(this.getHeight(node.left), this.getHeight(node.right));
    }

    calculateBalanceFactor(node) {
        return this.getHeight(node.left) - this.getHeight(node.right);
    }

    insertNode(node, parent, value) {

        if (node === null) {
            return new Node(value);
        }

        if (value < node.value) {
            node.left = this.insertNode(node.left, node, value);
            node.left.parent = node;
            node.left.level = 1 + node.level;
        } else {
            node.right = this.insertNode(node.right, node, value);
            node.right.parent = node;
            node.right.level = 1 + node.level;
        }

        node.height = this.updateHeight(node);

        let balanceFactor = this.calculateBalanceFactor(node);

        if (balanceFactor > 1 && value < node.left.value) {
            return this.rotateRight(node);
        }

        if (balanceFactor > 1 && value > node.left.value) {
            node.left = this.rotateLeft(node.left);
            return this.rotateRight(node);
        }

        if (balanceFactor < -1 && value > node.right.value) {
            return this.rotateLeft(node);
        }

        if (balanceFactor < -1 && value < node.right.value) {
            node.right = this.rotateRight(node.right);
            return this.rotateLeft(node);
        }

        return node;
    }

    rotateRight(y) {
        let x = y.left;
        let T2 = x.right;

        x.parent = y.parent;
        if (y.parent == null) {
            this.root = x;
        } else if(y.parent.left == y) {
            y.parent.left = x;
        } else {
            y.parent.right = x;
        }

        x.right = y;
        y.parent = x;

        // swap x and y level
        let tmpLvl = y.level;
        y.level = x.level;
        x.level = tmpLvl;

        // decrease x->left level
        if (x.left != null) {
            x.left.level -= 1;
        }

        y.left = T2;
        if (T2 != null) {
            T2.parent = y;
        }

        y.height = this.updateHeight(y);
        x.height = this.updateHeight(x);

        return x;
    }

    rotateLeft(y) {
        let x = y.right;
        let T2 = x.left;

        x.parent = y.parent;
        if (y.parent == null) {
            this.root = x;
        } else if(y.parent.left == y) {
            y.parent.left = x;
        } else {
            y.parent.right = x;
        }

        x.left = y;
        y.parent = x;

        // swap x and y level
        let tmpLvl = y.level;
        y.level = x.level;
        x.level = tmpLvl;

        // decrease x->left level
        if (x.right != null) {
            x.right.level -= 1;
        }

        y.right = T2;
        if (T2 != null) {
            T2.parent = y;
        }

        y.height = this.updateHeight(y);
        x.height = this.updateHeight(x);

        return x;
    }
}