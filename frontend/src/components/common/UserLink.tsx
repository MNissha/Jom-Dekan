import { useNavigate } from "react-router-dom";

/**
 * Clickable username used across discussions, resources, and comments to
 * link to a user's public profile (/users/:id). Rendered as a real
 * anchor for semantics/accessibility, but navigation is always driven
 * through useNavigate() with preventDefault+stopPropagation — several
 * call sites (resource cards, marketplace cards) already wrap the whole
 * card in its own <Link>, and a real nested <a> inside that outer
 * anchor is invalid HTML with inconsistent click-target behavior across
 * browsers.
 */
export function UserLink({
  userId,
  name,
  className,
}: {
  userId: string;
  name: string;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <a
      href={`/users/${userId}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        navigate(`/users/${userId}`);
      }}
      className={
        className ??
        "font-semibold text-slate-700 transition hover:text-primary-700 hover:underline"
      }
    >
      {name}
    </a>
  );
}
