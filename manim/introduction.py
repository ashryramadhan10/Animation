# reference: https://slama.dev/manim/opengl-and-interactivity/

from manim import *
from manim.opengl import *

# Pyglet key constants
from pyglet.window import key

class CreateCircle(Scene):
    def construct(self):
        circle = Circle()  # create a circle
        circle.set_fill(PINK, opacity=0.5)  # set the color and transparency
        square = Square()
        square.set_fill(BLUE, opacity=0.5)
        self.play(Create(circle))  # show the circle on screen
        self.play(Create(square))

        self.interactive_embed()

    def update(self, mobject):
        self.play(Rotate(mobject))

class KeyboardScene(Scene):
    def construct(self):
        # we're using self so it's available throughout the scene
        self.circle = Circle(color=BLUE)

        self.play(Write(self.circle))

        self.interactive_embed()

    def on_key_press(self, symbol, modifiers):
        """Called each time a key is pressed."""
        # grow the circle when plus is pressed
        if symbol == key.RIGHT:
            self.play(self.circle.animate.scale(2))

        # shrink it when minus is pressed
        elif symbol == key.LEFT:
            self.play(self.circle.animate.scale(1 / 2))

        # so we can still use the default controls
        super().on_key_press(symbol, modifiers)

class MouseScene(Scene):
    def construct(self):
        self.circle = Circle(color=BLUE)

        self.play(Write(self.circle))

        self.interactive_embed()

    def on_mouse_drag(self, point, d_point, buttons, modifiers):
        """Called each time the mouse is dragged (moves pressed across the windows)."""
        # resize the circle to where the mouse cursor currently is
        new_radius = np.linalg.norm(point) # magnitude

        # no animations (the object is already in the scene), only changes!
        self.circle.become(
            Circle(
                color=BLUE,
                radius=new_radius,
                fill_opacity=0.5 * abs(np.sin(new_radius)),  # for some spark ;)
            )
        )

        # here we DON'T want to use the default controls since dragging moves the camera

class CameraScene(Scene):
    def construct(self):
        square = Square(color=RED).shift(LEFT * 2)
        circle = Circle(color=BLUE).shift(RIGHT * 2)

        self.play(Write(square), Write(circle))

        # moving objects
        self.play(
            square.animate.shift(UP * 0.5),
            circle.animate.shift(DOWN * 0.5)
        )

        # rotating and filling the square (opacity 80%)
        # scaling and filling the circle (opacity 80%)
        self.play(
            square.animate.rotate(PI / 2).set_fill(RED, 0.8),
            circle.animate.scale(2).set_fill(BLUE, 0.8),
        )

        self.camera_states = []

        self.interactive_embed()

    def on_key_press(self, symbol, modifiers):
        # + adds a new camera position to interpolate
        if symbol == key.PLUS:
            print("New position added!")
            self.camera_states.append(self.camera.copy())

        # P plays the animations, one by one
        elif symbol == key.P:
            print("Replaying!")
            for cam in self.camera_states:
                self.play(self.camera.animate.become(cam))

        super().on_key_press(symbol, modifiers)

class ArrowTest(Scene):
    def construct(self):
        start = ORIGIN
        end = [2, 1, 0]

        # Create a dot and move it to the target
        dot = Dot()
        self.add(dot)

        # Create an arrow from start to end
        arrow = Arrow(start=start, end=end, buff=0)
        self.add(arrow)

        # Move the dot along the vector
        shift_vector = np.array(end) - np.array(start)
        dot.shift(shift_vector)

        self.wait(1)
        self.interactive_embed()
