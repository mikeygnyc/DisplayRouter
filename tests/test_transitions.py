from display.render import RenderFrame
from display.transitions import Transition, apply_transition


def test_transition_instant(capsys):
    frame = RenderFrame(text="Hello", style={"color": "#fff"})
    transition = Transition(type="instant")
    apply_transition(frame, transition, lambda f: print(f"[test] {f.text}"))
    captured = capsys.readouterr()
    assert "Hello" in captured.out


def test_transition_cut(capsys):
    frame = RenderFrame(text="Hello", style={"color": "#fff"})
    transition = Transition(type="cut")
    apply_transition(frame, transition, lambda f: print(f"[test] {f.text}"))
    captured = capsys.readouterr()
    assert "Hello" in captured.out


def test_transition_delay_ms(capsys):
    frame = RenderFrame(text="Hello", style={"color": "#fff"})
    transition = Transition(type="instant", delay_ms=0)
    apply_transition(frame, transition, lambda f: print(f"[test] {f.text}"))
    captured = capsys.readouterr()
    assert "Hello" in captured.out


def test_transition_slide(capsys):
    frame = RenderFrame(text="Hello", style={"color": "#fff"})
    transition = Transition(type="slide", duration_ms=0, direction="left")
    apply_transition(frame, transition, lambda f: print(f"[test] {f.text}"))
    captured = capsys.readouterr()
    assert "Hello" in captured.out


def test_transition_fade(capsys):
    frame = RenderFrame(text="Hello", style={"color": "#fff"})
    transition = Transition(type="fade", fade_in_ms=0, fade_out_ms=0)
    apply_transition(frame, transition, lambda f: print(f"[test] {f.text}"))
    captured = capsys.readouterr()
    assert "Hello" in captured.out


def test_transition_barn_door(capsys):
    frame = RenderFrame(text="Hello", style={"color": "#fff"})
    transition = Transition(type="barn_door", duration_ms=0, barn_direction="horizontal")
    apply_transition(frame, transition, lambda f: print(f"[test] {f.text}"))
    captured = capsys.readouterr()
    assert "Hello" in captured.out
