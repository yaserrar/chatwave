import { useSession } from '~/hooks/auth';

/** Who is using the app. A guest has no way back in once the cookie is gone, so there is no sign out. */
export function UserMenu() {
  const user = useSession().data;
  if (!user) return null;

  return (
    <div className="flex items-center gap-2.5 border-t border-sidebar-border px-2.5 py-2.5 pl-4.5">
      <span
        aria-hidden
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-ink"
      >
        {user.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] leading-4 font-medium text-sidebar-foreground">{user.name}</p>
        <p className="truncate text-xs leading-4 text-muted-foreground">Guest session</p>
      </div>
    </div>
  );
}
