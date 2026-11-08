import { Number } from "effect";

export type ImageSize = { readonly width: number; readonly height: number };
export type Framing = { readonly x: number; readonly y: number; readonly zoom: number };

export const constrain_framing = (image: ImageSize, framing: Framing): Framing => {
  const zoom = Number.clamp(framing.zoom, { minimum: 1, maximum: 3 });
  const half = Math.min(image.width, image.height) / zoom / 2;
  return {
    zoom,
    x: Number.clamp(framing.x, { minimum: half / image.width, maximum: 1 - half / image.width }),
    y: Number.clamp(framing.y, { minimum: half / image.height, maximum: 1 - half / image.height }),
  };
};

export const crop_bounds = (image: ImageSize, framing: Framing) => {
  const bounded = constrain_framing(image, framing);
  const size = Math.min(image.width, image.height) / bounded.zoom;
  return {
    x: Number.clamp(bounded.x * image.width - size / 2, { minimum: 0, maximum: image.width - size }),
    y: Number.clamp(bounded.y * image.height - size / 2, { minimum: 0, maximum: image.height - size }),
    size,
  };
};

export const move_framing = (image: ImageSize, framing: Framing, dx: number, dy: number): Framing => {
  const { size } = crop_bounds(image, framing);
  return constrain_framing(image, {
    ...framing,
    x: framing.x - dx * size / image.width,
    y: framing.y - dy * size / image.height,
  });
};
