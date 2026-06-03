function Button({
  width,
  height,
  text,
  href,
  onClick,
  disabled,
}: {
  width?: number;
  height?: number;
  text: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const baseClass =
    "w-full p-2 border border-solid border-gray-500 rounded-xl flex items-center justify-center transition-colors duration-300";
  const className = `${baseClass} ${disabled ? "cursor-not-allowed opacity-60 bg-gray-100 text-gray-500" : "cursor-pointer hover:bg-gray-950 hover:text-white hover:border-gray-950"}`;

  if (href) {
    return (
      <a
        className={className}
        style={{ width: width, height: height }}
        href={href}
      >
        {text}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={{ width: width, height: height }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}
export default Button;
