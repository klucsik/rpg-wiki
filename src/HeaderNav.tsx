import Link from "next/link";
import UserMenu from "./UserMenu";
import { useUser } from "./userContext";

export default function HeaderNav() {
  const { user } = useUser();
  return (
    <header className="w-full bg-gray-900 border-b border-gray-800 shadow flex items-center justify-between px-6 py-3 sticky top-0 z-50">
      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className="text-indigo-300 font-bold text-lg hover:text-indigo-100 transition"
        >
          RPG Wiki
        </Link>
        <Link
          href="/pages"
          className="text-indigo-300 hover:text-indigo-100 transition"
        >
          Pages
        </Link>
        {user?.group === "admin" && (
          <>
            <Link
              href="/admin"
              className="text-indigo-300 hover:text-indigo-100 transition"
            >
              Admin
            </Link>
          </>
        )}
      </nav>
      <UserMenu />
    </header>
  );
}
