#version 300 es
// Copyright (C) 2026 The Helium Authors. GPL-3.0-only; see ../license.txt.
// Artisan adaptation: pastel reflections with perceptual color interpolation.

precision highp float;

uniform vec2 u_size;
uniform float u_inverse_dpr;
uniform float u_stripe_width;
uniform float u_gradient_top;
uniform float u_gradient_vertical_span;
uniform float u_inverse_gradient_denominator;

uniform vec3 u_start_color;
uniform vec3 u_pearl_pink;
uniform vec3 u_pearl_green;
uniform float u_grain_alpha;
uniform float u_grain_luminance;
uniform float u_grain_contrast;
uniform float u_grain_saturation;
uniform sampler2D u_grain_noise;

flat in float v_stripe_start;
flat in vec3 v_band;
flat in vec3 v_band_inverse;
flat in float v_out_alpha;
flat in float v_highlight_strength;

const float GRAIN_SIZE = 180.0;

out vec4 fragment_color;

float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

vec3 overlayBlend(vec3 base, vec3 blend) {
    vec3 low = 2.0 * base * blend;
    vec3 high = 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);

    return mix(low, high, step(vec3(0.5), base));
}

vec3 srgbToOklab(vec3 color) {
    vec3 rgb = mix(color / 12.92, pow((color + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), color));
    vec3 lms = pow(vec3(
        dot(rgb, vec3(0.4122214708, 0.5363325363, 0.0514459929)),
        dot(rgb, vec3(0.2119034982, 0.6806995451, 0.1073969566)),
        dot(rgb, vec3(0.0883024619, 0.2817188376, 0.6299787005))
    ), vec3(1.0 / 3.0));
    return vec3(
        dot(lms, vec3(0.2104542553, 0.7936177850, -0.0040720468)),
        dot(lms, vec3(1.9779984951, -2.4285922050, 0.4505937099)),
        dot(lms, vec3(0.0259040371, 0.7827717662, -0.8086757660))
    );
}

vec3 oklabToSrgb(vec3 lab) {
    vec3 lms = vec3(
        dot(lab, vec3(1.0, 0.3963377774, 0.2158037573)),
        dot(lab, vec3(1.0, -0.1055613458, -0.0638541728)),
        dot(lab, vec3(1.0, -0.0894841775, -1.2914855480))
    );
    lms = lms * lms * lms;
    vec3 rgb = max(vec3(0.0), vec3(
        dot(lms, vec3(4.0767416621, -3.3077115913, 0.2309699292)),
        dot(lms, vec3(-1.2684380046, 2.6097574011, -0.3413193965)),
        dot(lms, vec3(-0.0041960863, -0.7034186147, 1.7076147010))
    ));
    return clamp(mix(rgb * 12.92, 1.055 * pow(rgb, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), rgb)), 0.0, 1.0);
}

float gradientHighlightAmount(float position) {
    if (position < v_band.x) {
        return 1.0 - clamp01(position * v_band_inverse.x);
    }

    if (position < v_band.y) {
        return clamp01((position - v_band.x) * v_band_inverse.y);
    }

    if (position < v_band.z) {
        return 1.0 - clamp01((position - v_band.y) * v_band_inverse.z);
    }

    return 0.0;
}

void main() {
    vec2 css_position = vec2(
        gl_FragCoord.x * u_inverse_dpr,
        u_size.y - gl_FragCoord.y * u_inverse_dpr
    );
    vec2 gradient_offset = vec2(
        css_position.x - v_stripe_start,
        css_position.y - u_gradient_top
    );
    vec2 gradient_axis = vec2(
        u_stripe_width,
        u_gradient_vertical_span
    );
    float gradient_position = clamp01(
        dot(gradient_offset, gradient_axis) * u_inverse_gradient_denominator
    );
    float stripe_index = v_stripe_start / u_stripe_width;
    float pink_amount = 0.5 + 0.5 * sin(stripe_index * 0.74 + gradient_position * 2.0);
    vec3 pink = srgbToOklab(u_pearl_pink);
    vec3 green = srgbToOklab(u_pearl_green);
    float pink_hue = mod(atan(pink.z, pink.y) + 6.2831853, 6.2831853);
    float green_hue = mod(atan(green.z, green.y) + 6.2831853, 6.2831853);
    float hue = mix(green_hue, pink_hue, pink_amount);
    float chroma = mix(length(green.yz), length(pink.yz), pink_amount);
    vec3 highlight_lab = vec3(mix(green.x, pink.x, pink_amount), chroma * cos(hue), chroma * sin(hue));
    float reflection = pow(gradientHighlightAmount(gradient_position), 5.0) * v_highlight_strength;
    vec3 color = oklabToSrgb(mix(srgbToOklab(u_start_color), highlight_lab, reflection));

    ivec2 grain_position = min(
        ivec2(mod(css_position, GRAIN_SIZE)),
        ivec2(GRAIN_SIZE - 1.0)
    );
    vec4 noise = texelFetch(u_grain_noise, grain_position, 0) - 0.5;
    float luminance = u_grain_luminance + noise.r * u_grain_contrast;
    vec3 color_shift = noise.gba * u_grain_saturation;
    vec3 grain = clamp((vec3(luminance) + color_shift) / 255.0, 0.0, 1.0);

    color = mix(color, overlayBlend(color, grain), u_grain_alpha);

    fragment_color = vec4(color * v_out_alpha, v_out_alpha);
}
