(function(global) {
"use strict";

const Demos = global.VisionPipelineP5Demos;
const Core = global.VisionPipelineCore;

function canvasSize() {
  const host = document.getElementById("canvasHost");
  const hostRect = host.getBoundingClientRect();
  const topbar = document.querySelector(".topbar");
  const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 0;
  return {
    width : Math.max(760, Math.floor(hostRect.width)),
    height : Math.max(540, Math.floor(window.innerHeight - topbarHeight - 30)),
  };
}

function populateDemoSelect(selectEl) {
  selectEl.innerHTML = "";
  for (const id of Core.DemoIds) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = Core.DemoLabels[id] || id;
    selectEl.appendChild(option);
  }
}

function startSketch() {
  const selectEl = document.getElementById("demoSelect");
  const pauseButton = document.getElementById("pauseButton");
  const resetButton = document.getElementById("resetButton");
  populateDemoSelect(selectEl);

  let demoState = Demos.createDemoState();
  let paused = false;
  let simFrame = 0;

  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.textContent = paused ? "Resume" : "Pause";
  });

  resetButton.addEventListener("click", () => {
    demoState = Demos.createDemoState();
    simFrame = 0;
  });

  selectEl.addEventListener("change", () => { simFrame = 0; });

  new global.p5((p) => {
    p.setup = () => {
      const size = canvasSize();
      p.createCanvas(size.width, size.height);
      p.frameRate(30);
      p.textFont(
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif");
    };

    p.draw = () => {
      Demos.drawDemo(p, demoState, selectEl.value, simFrame);
      if (!paused)
        simFrame += 1;
    };

    p.windowResized = () => {
      const size = canvasSize();
      p.resizeCanvas(size.width, size.height);
    };
  }, document.getElementById("canvasHost"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startSketch);
} else {
  startSketch();
}
}(globalThis));
