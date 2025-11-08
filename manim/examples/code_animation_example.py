from manim import *

class CodeAnimationExample(Scene):
    def construct(self):
        # Approach 1: Create multiple Code objects for each line
        # This gives you full control over each line
        self.approach_1()
        self.wait(1)
        self.clear()

        # Approach 2: Create full code block, then show/hide lines
        self.approach_2()
        self.wait(1)
        self.clear()

        # Approach 3: Use code_string parameter to dynamically build code
        self.approach_3()

    def approach_1(self):
        """Create separate Code objects for each line"""
        title = Text("Approach 1: Separate Code Objects").scale(0.6).to_edge(UP)
        self.play(Write(title))

        # Create individual code lines
        line1 = Code(
            code_string="def factorial(n):",
            language="python",
        ).to_edge(LEFT).shift(UP)

        line2 = Code(
            code_string="    if n == 0:",
            language="python",
        ).next_to(line1, DOWN, aligned_edge=LEFT, buff=0.1)

        line3 = Code(
            code_string="        return 1",
            language="python",
        ).next_to(line2, DOWN, aligned_edge=LEFT, buff=0.1)

        # Animate each line
        self.play(Create(line1))
        self.wait(0.5)
        self.play(Create(line2))
        self.wait(0.5)
        self.play(Create(line3))
        self.wait(0.5)

        # Uncreate them
        self.play(Uncreate(line2))
        self.wait(0.3)
        self.play(Uncreate(line1))
        self.play(Uncreate(line3))

    def approach_2(self):
        """Create full code block and access individual lines"""
        title = Text("Approach 2: Full Block with Line Access").scale(0.6).to_edge(UP)
        self.play(Write(title))

        # Create full code block
        code_block = Code(
            code_string="""def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)""",
            language="python",
        ).shift(LEFT * 2)

        # Code object has a code attribute that contains the text
        # You can access it but animating individual lines is tricky
        # Better to animate the whole block
        self.play(Create(code_block))
        self.wait(1)
        self.play(Uncreate(code_block))

    def approach_3(self):
        """Build code string dynamically and recreate"""
        title = Text("Approach 3: Dynamic Code Building").scale(0.6).to_edge(UP)
        self.play(Write(title))

        lines = [
            "def sum_array(arr):",
            "    total = 0",
            "    for num in arr:",
            "        total += num",
            "    return total"
        ]

        current_code = []
        code_obj = None

        for i, line in enumerate(lines):
            current_code.append(line)

            # Create new code object with accumulated lines
            new_code = Code(
                code_string="\n".join(current_code),
                language="python",

            ).to_edge(LEFT)

            if code_obj:
                # Replace old code with new
                self.play(
                    Uncreate(code_obj),
                    Create(new_code),
                    run_time=0.8
                )
            else:
                # First line
                self.play(Create(new_code))

            code_obj = new_code
            self.wait(0.5)

        self.wait(1)
        self.play(Uncreate(code_obj))


# To render: manim -pql code_animation_example.py CodeAnimationExample
