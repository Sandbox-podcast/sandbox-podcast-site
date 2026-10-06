'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/latest', label: 'Latest' },
  { href: '/charts', label: 'Charts' },
  { href: '/episodes', label: 'Episodes' },
  { href: '/topics', label: 'Topics' },
  { href: '/about', label: 'About' },
] as const;

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale">
      <ul className="flex items-center justify-between gap-5 py-1 md:justify-start md:gap-7">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="nav-link"
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
