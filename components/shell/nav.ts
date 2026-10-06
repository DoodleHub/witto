export const NAV_ITEMS = [
  { href: "/", label: "Today" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

/** The view transition for moving between tabs: rightward tabs slide in from the right, and leftward ones from the left. */
export function navTransition(pathname: string, href: string): string[] | undefined {
  const index = (path: string) => NAV_ITEMS.findIndex((item) => (item.href === "/" ? path === "/" : path.startsWith(item.href)));
  const from = index(pathname);
  const to = index(href);
  if (from === -1 || from === to) return undefined;
  return [to > from ? "nav-forward" : "nav-back"];
}
