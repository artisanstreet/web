import * as stylex from "@stylexjs/stylex";
import arrow_url from "./arrow-narrow-right.svg?url";

const styles = stylex.create({
  icon: {
    display: "block",
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
    backgroundColor: "currentColor",
    maskSize: "contain",
    maskPosition: "center",
    maskRepeat: "no-repeat",
  },
  image: (url: string) => ({ maskImage: `url("${url}")` }),
});

export function ArrowNarrowRight({ xstyle }: Readonly<{ xstyle?: stylex.StyleXStyles }>) {
  return <span {...stylex.props(styles.icon, styles.image(arrow_url), xstyle)} aria-hidden="true" />;
}
