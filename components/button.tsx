import "../style/index.css";
function Button({
  width,
  height,
  text,
  href,
}: {
  width?: number;
  height?: number;
  text: string;
  href?: string;
}) {
  return (
    <div
      className="cursor-pointer border border-solid border-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-950 hover:text-white hover:border-gray-950 transition-colors duration-300"
      style={{ width: width, height: height }}
    >
      <a className="decoration-none" href={href}>
        {text}
      </a>
    </div>
  );
}
export default Button;
