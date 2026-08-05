"use client";

/** Submit button that asks for confirmation before firing its form action. */
export default function ConfirmButton({
  message = "Are you sure? This cannot be undone.",
  className,
  children,
}: {
  message?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
