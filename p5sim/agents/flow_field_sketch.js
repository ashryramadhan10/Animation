let flow_field;
let numOfVehicles = 50;
let vehicles = [];

let btn, chunks = [];
const fr = 60;

function setup() {
    createCanvas(1520, 720);
    frameRate(fr);
    btn = document.querySelector('button');
    btn.onclick = record;

    background(0);
    let resolution = 20;
    let rows = height / resolution;
    let cols = width / resolution;
    flow_field = new FlowField(rows, cols, resolution);
    flow_field.init();

    for (let i = 0; i < numOfVehicles; i++) {
        vehicles[i] = new Vehicle(random(width), random(height));
    }
}

function draw() {
    background(0);

    // flow_field.display();

    for (let i = 0; i < numOfVehicles; i++) {
        let followForce = vehicles[i].follow(flow_field);
        vehicles[i].applyForce(followForce);
        // vehicles[i].fleeGroup();
        vehicles[i].run();
    }
}