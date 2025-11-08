from manim import *

def remove_invisible_chars(code_paragraph):
    """Remove invisible characters from code paragraph"""
    for line in code_paragraph:
        line.submobjects = [char for char in line.submobjects if char.height > 0]
    return code_paragraph


class CodeHighlightExample(Scene):
    def construct(self):
        """Highlight code lines with different delays - based on StackOverflow solution"""

        # Create code block
        code = Code(
            code_string="""def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr""",
            language="python",
            background="window",
            formatter_style="monokai",
            add_line_numbers=False
        )

        self.play(Create(code))
        self.wait(1)

        # Get code components
        background = code.submobjects[0]  # Background window
        paragraph = code.submobjects[1]   # Code text (Paragraph)

        # Remove invisible characters for accurate bounding
        paragraph = remove_invisible_chars(paragraph)

        # Define delays for each line (progressively longer)
        delays = [0.3, 0.5, 0.8, 1.2, 1.5, 1.0, 0.5]

        # Create highlight rectangles for each line
        for i, line in enumerate(paragraph.submobjects):
            # Create rectangle around the line
            highlight = SurroundingRectangle(
                line,
                color=YELLOW,
                buff=0.05,
                stroke_width=3
            )
            # Stretch to full width of code background
            highlight.stretch_to_fit_width(background.width)
            highlight.align_to(background, LEFT)

            # Animate
            self.play(Create(highlight), run_time=0.3)
            self.wait(delays[i])
            self.play(FadeOut(highlight), run_time=0.2)

        self.wait(1)


class CodeHighlightWithFill(Scene):
    def construct(self):
        """Highlight with filled background and different speed patterns"""

        # Create code block
        code = Code(
            code_string="""# Fast section
import numpy as np
x = [1, 2, 3]

# Slow section (important)
result = sum(x) / len(x)
mean = np.mean(x)

# Fast section again
print(result)""",
            language="python",
            background="window",
            add_line_numbers=False
        )

        self.play(Create(code))
        self.wait(1)

        # Get code components
        background = code.submobjects[0]
        paragraph = code.submobjects[1]
        paragraph = remove_invisible_chars(paragraph)

        num_lines = len(paragraph.submobjects)

        # Generate delays and colors based on line position
        delays = []
        colors = []

        for i in range(num_lines):
            if i < 3:
                # Fast section - blue
                delays.append(0.3)
                colors.append(BLUE)
            elif i < num_lines - 2:
                # Slow section - yellow
                delays.append(1.5)
                colors.append(YELLOW)
            else:
                # Fast section - blue
                delays.append(0.3)
                colors.append(BLUE)

        # Highlight each line
        for i, line in enumerate(paragraph.submobjects):
            # Create filled highlight
            highlight = SurroundingRectangle(
                line,
                color=colors[i],
                buff=0.05,
                stroke_width=3,
                fill_opacity=0.2
            )
            highlight.stretch_to_fit_width(background.width)
            highlight.align_to(background, LEFT)

            # Animate
            self.play(FadeIn(highlight), run_time=0.3)
            self.wait(delays[i])
            self.play(FadeOut(highlight), run_time=0.2)

        self.wait(1)


# To render:
# manim -pql code_highlight_example.py CodeHighlightExample
# manim -pql code_highlight_example.py CodeHighlightWithFill
