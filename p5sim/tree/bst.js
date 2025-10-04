class Node {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
        this.parent = null;
        this.height = 1;
        this.pos = createVector(0, 0);
        this.targetPos = createVector(0, 0);
        this.r = 30;
        this.level = 1;
        this.isNew = false;
    }
}

class BST {
    constructor() {
        this.root = null;
        this.animationSpeed = 0.05;
    }

    insert(value) {
        this.root = this.insertNode(this.root, null, value);
        this.calculatePositions();
    }
    
    calculatePositions() {
        if (this.root) {
            this.setNodePositions(this.root);
        }
    }
    
    setNodePositions(node) {
        if (!node) return;
        
        if (node.parent == null) {
            node.targetPos.x = width / 2;
            node.targetPos.y = 100;
        } else {
            let theta = 0;
            let decreaseVal = PI/12;
            if (node.value < node.parent.value) {
                theta = PI/2 + PI/4;
                if (node.level > 2) {
                    theta = PI/2 + PI/4 - ((node.level-2) * decreaseVal);
                }
            } else {
                theta = PI/4;
                if (node.level > 2) {
                    theta = PI/4 + ((node.level-2) * decreaseVal);
                }
            }
            
            let radius = 350 / node.level;
            node.targetPos.x = radius * cos(theta) + node.parent.targetPos.x;
            node.targetPos.y = radius * sin(theta) + node.parent.targetPos.y;
        }
        
        if (node.isNew) {
            if (node.parent) {
                node.pos.set(node.parent.pos);
            } else {
                node.pos.set(node.targetPos);
            }
            node.isNew = false;
        }
        
        this.setNodePositions(node.left);
        this.setNodePositions(node.right);
    }
    
    update() {
        if (this.root) {
            return this.updateNodePositions(this.root);
        }
        return false;
    }
    
    updateNodePositions(node) {
        if (!node) return false;
        
        let isMoving = p5.Vector.dist(node.pos, node.targetPos) > 1;
        node.pos.lerp(node.targetPos, this.animationSpeed);
        
        let leftMoving = this.updateNodePositions(node.left);
        let rightMoving = this.updateNodePositions(node.right);
        
        return isMoving || leftMoving || rightMoving;
    }

    render(node) {
        if (node == null) {
            return;
        }

        // Draw connections first
        if (node.parent != null) {
            stroke(0);
            line(node.parent.pos.x, node.parent.pos.y, node.pos.x, node.pos.y);
        }

        // Draw node
        if (node.parent == null) {
            fill(255, 100, 100);
        } else {
            fill(100, 255, 100);
        }
        stroke(255);
        circle(node.pos.x, node.pos.y, node.r);
        
        // Draw text
        fill(0);
        let textsize = 15;
        textSize(textsize);
        textAlign(CENTER, CENTER);
        text(node.value, node.pos.x, node.pos.y);
        text("H" + node.height, node.pos.x, node.pos.y - node.r);
        text("L" + node.level, node.pos.x, node.pos.y + node.r);

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
            let newNode = new Node(value);
            newNode.isNew = true;
            return newNode;
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
        let yParentLevel = 0;
        if (y.parent != null) {
            yParentLevel = y.parent.level;
        }

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

        y.left = T2;
        if (T2 != null) {
            T2.parent = y;
        }

        // update height
        y.height = this.updateHeight(y);
        x.height = this.updateHeight(x);

        // update depth/level start from x traversing
        this.updateNodeLevel(x, yParentLevel+1);

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

        y.right = T2;
        if (T2 != null) {
            T2.parent = y;
        }

        y.height = this.updateHeight(y);
        x.height = this.updateHeight(x);

        // update depth/level start from x traversing
        this.updateNodeLevel(x, yParentLevel+1);

        return x;
    }

    updateNodeLevel(node, level) {
        if (!node) return;

        // update level
        node.level = level;
        level++;

        this.updateNodeLevel(node.left, level);
        this.updateNodeLevel(node.right, level);
    }
}