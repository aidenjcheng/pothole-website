
const DoubleChevronLeft = (props: React.ComponentProps<"svg">) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M18 17L13 12L18 7M11 17L6 12L11 7"
      stroke="black"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export default DoubleChevronLeft;
