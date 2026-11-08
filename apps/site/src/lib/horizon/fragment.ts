export const fragment_source = `
precision highp float;
uniform vec2 resolution;
uniform float elapsed;
uniform float horizon;
varying vec2 uv;
const vec3 palette_0 = vec3(0.163456716, 0.052060486, 272.012543358);
const vec3 palette_1 = vec3(0.243426037, 0.089919545, 269.533697112);
const vec3 palette_2 = vec3(0.366245696, 0.114125729, 264.287669929);
const vec3 palette_3 = vec3(0.571379214, 0.097190555, 254.273530282);
const vec3 palette_4 = vec3(0.805291980, 0.046041412, 246.342348214);
vec3 srgb(vec3 linear_rgb) {
    vec3 low = linear_rgb * 12.92;
    vec3 high = 1.055 * pow(max(linear_rgb, 0.0), vec3(1.0 / 2.4)) - 0.055;
    return vec3(linear_rgb.r <= 0.0031308 ? low.r : high.r,
        linear_rgb.g <= 0.0031308 ? low.g : high.g,
        linear_rgb.b <= 0.0031308 ? low.b : high.b);
}

vec3 oklab(vec3 lch) {
    float hue = radians(lch.z);
    return vec3(lch.x, lch.y * cos(hue), lch.y * sin(hue));
}

vec3 lab_linear(vec3 lab) {
    vec3 lms = vec3(lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z,
        lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z,
        lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z);
    lms = lms * lms * lms;
    vec3 linear_rgb = vec3(4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
        -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
        -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z);
    return max(linear_rgb, 0.0);
}

vec3 lab_srgb(vec3 lab) {
    return srgb(lab_linear(lab));
}

vec3 linear_srgb(vec3 color) {
    vec3 low = color / 12.92;
    vec3 high = pow((max(color, 0.0) + 0.055) / 1.055, vec3(2.4));
    return vec3(color.r <= 0.04045 ? low.r : high.r,
        color.g <= 0.04045 ? low.g : high.g,
        color.b <= 0.04045 ? low.b : high.b);
}

vec3 gradient_segment(vec3 a, vec3 b, vec3 slope_a, vec3 slope_b, float width, float position) {
    float t = clamp(position / width, 0.0, 1.0);
    float t2 = t * t;
    float t3 = t2 * t;
    return (2.0 * t3 - 3.0 * t2 + 1.0) * a
        + (t3 - 2.0 * t2 + t) * width * slope_a
        + (-2.0 * t3 + 3.0 * t2) * b
        + (t3 - t2) * width * slope_b;
}

vec3 sky_color(float altitude) {
    vec3 p0 = oklab(palette_0);
    vec3 p1 = oklab(palette_1);
    vec3 p2 = oklab(palette_2);
    vec3 p3 = oklab(palette_3);
    vec3 p4 = oklab(palette_4);
    vec3 m0 = (p1 - p0) / 0.24;
    vec3 m1 = (p2 - p0) / 0.46;
    vec3 m2 = (p3 - p1) / 0.44;
    vec3 m3 = (p4 - p2) / 0.42;
    vec3 m4 = (p4 - p3) / 0.20;
    vec3 lab = altitude < 0.24
        ? gradient_segment(p0, p1, m0, m1, 0.24, altitude)
        : altitude < 0.46
            ? gradient_segment(p1, p2, m1, m2, 0.22, altitude - 0.24)
            : altitude < 0.68
                ? gradient_segment(p2, p3, m2, m3, 0.22, altitude - 0.46)
                : gradient_segment(p3, p4, m3, m4, 0.20, altitude - 0.68);
    return lab_srgb(lab);
}

vec3 sky_irradiance(vec3 normal) {
    vec3 horizon_light = linear_srgb(sky_color(0.68));
    vec3 zenith_light = linear_srgb(sky_color(0.24));
    vec3 irradiance = vec3(0.0);
    for (int row = 0; row < 4; row++) {
        float height = (float(row) + 0.5) / 4.0;
        float ring = sqrt(1.0 - height * height);
        vec3 radiance = mix(horizon_light, zenith_light, height) * 4.0;
        for (int column = 0; column < 4; column++) {
            float azimuth = (float(column) + 0.5) * 3.141592654 / 4.0;
            vec3 direction = vec3(ring * cos(azimuth), -height, -ring * sin(azimuth));
            irradiance += radiance * max(dot(normal, direction), 0.0);
        }
    }
    return irradiance * (3.141592654 / 16.0);
}

float visibility(float cosine, float alpha2) {
    return 2.0 * cosine / max(cosine + sqrt(alpha2 + (1.0 - alpha2) * cosine * cosine), 0.0001);
}

vec3 planet_color(vec2 projected, float radius) {
    float depth = sqrt(max(radius * radius - dot(projected, projected), 0.0));
    vec3 normal = normalize(vec3(projected, depth));
    vec3 view = vec3(0.0, 0.0, 1.0);
    vec3 light = normalize(vec3(-0.25, -0.16, -0.955));
    vec3 halfway = normalize(light + view);
    float nl = max(dot(normal, light), 0.0);
    float nv = max(dot(normal, view), 0.0001);
    float nh = max(dot(normal, halfway), 0.0);
    float vh = max(dot(view, halfway), 0.0);
    float alpha2 = pow(0.65, 4.0);
    float distribution_base = nh * nh * (alpha2 - 1.0) + 1.0;
    float distribution = alpha2 / (3.141592654 * distribution_base * distribution_base);
    float fresnel = 0.04 + 0.96 * pow(1.0 - vh, 5.0);
    float geometry = visibility(nl, alpha2) * visibility(nv, alpha2);
    float specular = distribution * fresnel * geometry / max(4.0 * nl * nv, 0.0001);
    vec3 albedo = lab_linear(oklab(vec3(0.50, 0.012, 250.0)));
    vec3 sunlight = lab_linear(oklab(vec3(0.97, 0.012, 220.0))) * 3.0;
    vec3 direct = (albedo * (1.0 - fresnel) / 3.141592654 + specular) * sunlight * nl;
    float sky_fresnel = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
    vec3 indirect = albedo * (1.0 - sky_fresnel) * sky_irradiance(normal) / 3.141592654;
    vec3 reflected = reflect(-view, normal);
    float sky_visibility = max(-reflected.y, 0.0) * max(-reflected.z, 0.0);
    vec3 reflection = linear_srgb(sky_color(0.52)) * sky_fresnel * sky_visibility * 0.35;
    vec3 radiance = max(direct + indirect + reflection, 0.0);
    float luminance = dot(radiance, vec3(0.2126, 0.7152, 0.0722));
    return srgb(mix(vec3(luminance), radiance, 0.06) * 0.16);
}

float screen_noise(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

float hash(vec2 p) {
    vec3 q = fract(vec3(p.x, p.y, p.x) * 0.1031);
    q += vec3(dot(q, q.yzx + vec3(33.33)));
    return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
        mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
    vec3 sunlight = lab_srgb(oklab(vec3(0.97, 0.012, 220.0)));
    vec2 size = resolution;
    float time = elapsed;
    float unit = min(size.x, size.y * 1.4);
    float x = (uv.x - 0.5) * size.x / unit;
    float y = (uv.y - horizon) * size.y / unit;
    float radius = 3.125;
    vec2 projected = vec2(x, y - radius);
    float altitude = length(projected) - radius;
    float pixel = 1.0 / unit;
    float above = smoothstep(-pixel, pixel * 1.5, altitude);
    float gradient = 0.88 - max(altitude, 0.0) * 2.2 + sin(time * 0.03) * 0.002;
    vec3 color = altitude > pixel * 1.5
        ? sky_color(gradient)
        : mix(planet_color(projected, radius), sky_color(gradient), above);
    float burn_time = time * 0.55;
    float coarse = noise(vec2(x * 22.0 - burn_time * 0.3, burn_time * 0.4));
    float serration = noise(vec2(x * 100.0 - burn_time * 0.5, burn_time * 1.4));
    float chatter = noise(vec2(x * 270.0 + burn_time * 0.8, burn_time * 3.7));
    float warp = (coarse - 0.5) * 0.0012 + (chatter - 0.5) * 0.0006;
    float distance_to_rim = altitude + warp;
    float reach = 0.0010 + serration * serration * serration * 0.005;
    float flame = noise(vec2(x * 180.0 + coarse - 0.5, altitude * 180.0 - burn_time * 2.5));
    float burn = exp(-abs(distance_to_rim) / reach) * smoothstep(0.25, 0.85, flame)
        * (1.0 - smoothstep(0.004, 0.009, distance_to_rim))
        * smoothstep(-0.003, 0.001, distance_to_rim);
    float rim = exp(-abs(distance_to_rim) * 1000.0) * (0.85 + chatter * 0.12)
        * (0.95 + serration * 0.10);
    float glow = exp(-abs(distance_to_rim) * 150.0) * 0.20;
    float sun = exp(-x * x * 35.0) * exp(-abs(distance_to_rim) * 140.0) * 0.10;
    color += sunlight * (rim * 0.70 + burn * 0.40 + glow * 0.40 + sun);
    color += sky_color(0.68) * (glow * 0.40 + burn * 0.50);
    vec2 screen_pixel = floor(gl_FragCoord.xy);
    vec3 dither = vec3(screen_noise(screen_pixel),
        screen_noise(screen_pixel + vec2(17.0, 59.0)),
        screen_noise(screen_pixel + vec2(43.0, 11.0))) - 0.5;
    color += dither / 255.0;
    gl_FragColor = vec4(max(color, 0.0), 1.0);
}
`;
