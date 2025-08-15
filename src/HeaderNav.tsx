import Link from "next/link";
import UserMenu from "./UserMenu";
import { useUser } from "./userContext";
import SearchBar from "./components/search/SearchBar";

interface HeaderNavProps {
  showSidebarToggle?: boolean;
  onSidebarToggle?: () => void;
  sidebarOpen?: boolean;
}

export default function HeaderNav({ 
  showSidebarToggle = false, 
  onSidebarToggle, 
  sidebarOpen = false 
}: HeaderNavProps) {
  const { user } = useUser();
  return (
    <header className="w-full bg-gray-900 border-b border-gray-800 shadow flex items-center justify-between px-4 sm:px-6 py-3 sticky top-0 z-50 h-16 min-w-0">
      <nav className="flex items-center gap-3 sm:gap-6 min-w-0 flex-shrink">
        {showSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="text-indigo-300 hover:text-indigo-100 transition lg:hidden flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        )}
        <Link
          href="/"
          className="text-indigo-300 font-bold text-lg hover:text-indigo-100 transition flex-shrink-0"
        >
          RPG Wiki
        </Link>
        <Link
          href="/pages"
          className="text-indigo-300 hover:text-indigo-100 transition hidden sm:block"
        >
          Pages
        </Link>
        <Link
          href="/admin/changelog"
          className="text-indigo-300 hover:text-indigo-100 transition hidden sm:block"
        >
          Changelog
        </Link>
        {user?.groups?.includes("admin") && (
          <Link
            href="/admin"
            className="text-indigo-300 hover:text-indigo-100 transition hidden sm:block"
          >
            Admin
          </Link>
        )}
      </nav>
      
      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <SearchBar placeholder="Search wiki..." />
      </div>
      
      <div className="flex-shrink-0 ml-2">
        <UserMenu />
      </div>
    </header>
  );
}
