import styles from "../styles/SiteButton.module.css";

export default function SiteButton({
  href,
  children,
  variant = "primary",
  size = "standard",
  className = "",
  ...props
}) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ].filter(Boolean).join(" ");

  if (href) {
    return <a className={classes} href={href} {...props}>{children}</a>;
  }

  return <button className={classes} {...props}>{children}</button>;
}
