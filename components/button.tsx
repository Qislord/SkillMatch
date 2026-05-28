function Button({
  width,
  height,
  text,
  href,
  onClick,
}: {
  width?: number;
  height?: number;
  text: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "w-full cursor-pointer border border-solid border-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-950 hover:text-white hover:border-gray-950 transition-colors duration-300";

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
      onClick={onClick}
    >
      {text}
    </button>
  );
}
export default Button;
