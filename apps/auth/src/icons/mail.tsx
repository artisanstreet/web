import envelope_url from "./envelope.svg?url";

export function Mail() {
  return (
    <img
      src={envelope_url}
      width={16}
      height={16}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
