import rgbmatrix
import rgbmatrix.core as core
import rgbmatrix.graphics as graphics


def test_rgbmatrix_core_api_surface():
    assert hasattr(rgbmatrix, "RGBMatrix")
    assert hasattr(rgbmatrix, "RGBMatrixOptions")
    assert hasattr(rgbmatrix, "FrameCanvas")

    opts = core.RGBMatrixOptions()
    required = [
        "hardware_mapping", "rows", "cols", "chain_length", "parallel",
        "pwm_bits", "pwm_lsb_nanoseconds", "brightness", "scan_mode",
        "multiplexing", "row_address_type", "disable_hardware_pulsing",
        "show_refresh_rate", "inverse_colors", "led_rgb_sequence",
        "pixel_mapper_config", "panel_type", "pwm_dither_bits",
        "limit_refresh_rate_hz", "gpio_slowdown", "daemon",
        "drop_privileges", "drop_priv_user", "drop_priv_group",
    ]
    for name in required:
        assert hasattr(opts, name)

    matrix = core.RGBMatrix(options=opts)
    assert hasattr(matrix, "CreateFrameCanvas")
    assert hasattr(matrix, "SwapOnVSync")
    assert hasattr(matrix, "Fill")
    assert hasattr(matrix, "SetPixel")
    assert hasattr(matrix, "Clear")
    assert hasattr(matrix, "luminanceCorrect")
    assert hasattr(matrix, "pwmBits")
    assert hasattr(matrix, "brightness")
    assert hasattr(matrix, "width")
    assert hasattr(matrix, "height")

    frame = matrix.CreateFrameCanvas()
    assert hasattr(frame, "Fill")
    assert hasattr(frame, "SetPixel")
    assert hasattr(frame, "Clear")
    assert hasattr(frame, "SetImage")
    assert hasattr(frame, "SetPixelsPillow")
    assert hasattr(frame, "width")
    assert hasattr(frame, "height")
    assert hasattr(frame, "pwmBits")
    assert hasattr(frame, "brightness")


def test_rgbmatrix_graphics_api_surface():
    assert hasattr(graphics, "Color")
    assert hasattr(graphics, "Font")
    assert hasattr(graphics, "DrawText")
    assert hasattr(graphics, "DrawCircle")
    assert hasattr(graphics, "DrawLine")

    color = graphics.Color(1, 2, 3)
    assert color.red == 1
    assert color.green == 2
    assert color.blue == 3
