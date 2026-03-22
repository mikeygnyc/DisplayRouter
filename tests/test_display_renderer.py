from types import SimpleNamespace

import display.rgbmatrix_renderer as renderer
from display.render import RenderFrame


def test_rgbmatrix_renderer_with_mocks(monkeypatch):
    calls = {}

    class FakeMatrix:
        def SetImage(self, image):
            calls['image'] = image

    class FakeOptions:
        def __init__(self):
            self.rows = None
            self.cols = None
            self.chain_length = None
            self.parallel = None
            self.brightness = None
            self.gpio_slowdown = None
            self.hardware_mapping = None

    class FakeRGBMatrix:
        def __init__(self, options=None):
            calls['options'] = options
        def SetImage(self, image):
            calls['image'] = image

    class FakeImage:
        def __init__(self, mode, size):
            self.mode = mode
            self.size = size

    class FakeImageDraw:
        def __init__(self, image):
            self.image = image
        def text(self, pos, text, fill=None, font=None):
            calls['text'] = text

    class FakeImageFont:
        @staticmethod
        def truetype(path, size):
            return 'font'
        @staticmethod
        def load_default():
            return 'font'

    monkeypatch.setattr(renderer, '_RGBMATRIX_AVAILABLE', True)
    monkeypatch.setattr(renderer, 'RGBMatrixOptions', FakeOptions)
    monkeypatch.setattr(renderer, 'RGBMatrix', FakeRGBMatrix)
    monkeypatch.setattr(renderer, 'Image', SimpleNamespace(new=lambda mode, size: FakeImage(mode, size)))
    monkeypatch.setattr(renderer, 'ImageDraw', SimpleNamespace(Draw=lambda img: FakeImageDraw(img)))
    monkeypatch.setattr(renderer, 'ImageFont', FakeImageFont)

    frame = RenderFrame(text='HELLO', style={'color': '#ffcc00'})
    renderer._matrix = None
    renderer.render_frame(frame)

    assert 'options' in calls
    assert calls.get('text') == 'HELLO'
    assert 'image' in calls
