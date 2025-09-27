let flow_field;
let vehicle;

function setup() {
    createCanvas(500, 500);
    background(0);
    let resolution = 20;
    let rows = height / resolution;
    let cols = width / resolution;
    flow_field = new FlowField(rows, cols, resolution);
    flow_field.init();

    vehicle = new Vehicle(random(width), random(height));
}

function draw() {
    background(0);

    flow_field.display();

    let followForce = vehicle.follow(flow_field);
    vehicle.applyForce(followForce);
    vehicle.run();
}