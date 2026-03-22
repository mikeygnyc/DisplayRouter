from display.render import RenderFrame
from display.transitions import Transition, apply_transition


def test_transition_delay_smoke(capsys):
    frame = RenderFrame(text="Hello", style={"color": "#fff"})
    transition = Transition(type="delay", duration_ms=0)
    apply_transition(frame, transition)
    captured = capsys.readouterr()
    assert "render text='Hello'" in captured.out
