let vehicles = [];

function setup() {
    createCanvas(1520, 720);
    background(0);
}

function draw() {
    background(0);

    for (let vehicle of vehicles) {
        vehicle.run(vehicles);
    }
}

function mouseDragged(event) {
    let boid = new Boid(mouseX, mouseY, random(5, 10));
    vehicles.push(boid);
}