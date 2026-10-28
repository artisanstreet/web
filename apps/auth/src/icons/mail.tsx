import envelope_url from "./envelope.svg?url";

export function Mail({ size = 16 }: Readonly<{ size?: number }>) {
  return (
    <img
      src={envelope_url}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
