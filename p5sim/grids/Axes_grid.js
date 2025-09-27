function setup() {
  createCanvas(700, 700);
  background(0);
}

function draw() {
  background(0);

  translate(width / 2, height / 2); // Move origin to the center of the canvas
  
  // applyMatrix(1, 0.5, 0.5, 1, 0, 0);
  
  // Draw the grid
  drawGrid(50); // Grid with 50 units spacing

  circle(100, -50, 16);
  
  // Draw the axes
  stroke(150, 150, 255);
  strokeWeight(3);
  line(-width / 2, 0, width / 2, 0); // X axis
  line(0, -height / 2, 0, height / 2); // Y axis
  
  // Draw the tick marks and labels for X axis
  for (let i = -width / 2; i <= width / 2; i += 50) {
    line(i, -5, i, 5);  // Tick marks on X axis
    if (i !== 0) {
      text(i, i + 5, 20);  // Labels for X axis ticks
    }
  }
  
  // Draw the tick marks and labels for Y axis
  for (let i = -height / 2; i <= height / 2; i += 50) {
    line(-5, i, 5, i);  // Tick marks on Y axis
    if (i !== 0) {
      text(i, 20, i + 5);  // Labels for Y axis ticks
    }
  }
}

// Function to draw the grid
function drawGrid(gridSpacing) {
  stroke(150, 150, 255, 50);
  strokeWeight(3);
  for (let x = -width / 2; x <= width / 2; x += gridSpacing) {
    line(x, -height / 2, x, height / 2); // Vertical grid lines
  }
  for (let y = -height / 2; y <= height / 2; y += gridSpacing) {
    line(-width / 2, y, width / 2, y); // Horizontal grid lines
  }
}