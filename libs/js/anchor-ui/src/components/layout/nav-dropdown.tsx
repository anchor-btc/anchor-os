'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ExternalLink, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { type AccentColor } from './app-logo';
import { accentActiveColors } from './nav-link';

export interface NavDropdownItem {
  /**
   * URL to navigate to
   */
  href: string;
  /**
   * Link label
   */
  label: string;
  /**
   * Optional icon
   */
  icon?: LucideIcon;
  /**
   * Whether this is an external link
   */
  external?: boolean;
}

export interface NavDropdownProps {
  /**
   * Dropdown trigger label
   */
  label: string;
  /**
   * Optional trigger icon
   */
  icon?: LucideIcon;
  /**
   * Dropdown menu items
   */
  items: NavDropdownItem[];
  /**
   * Accent color for active state
   */
  accentColor?: AccentColor;
  /**
   * Additional CSS classes for the trigger
   */
  className?: string;
}

/**
 * NavDropdown - Dropdown navigation menu for grouping related links.
 * Automatically detects if any child link is active.
 *
 * @example
 * ```tsx
 * <NavDropdown
 *   label="Explore"
 *   icon={Compass}
 *   accentColor="purple"
 *   items={[
 *     { href: "/attestations", label: "Attestations", icon: CheckCircle },
 *     { href: "/disputes", label: "Disputes", icon: AlertTriangle },
 *   ]}
 * />
 * ```
 */
export function NavDropdown({
  label,
  icon: Icon,
  items,
  accentColor = 'orange',
  className,
}: NavDropdownProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Check if any dropdown item is active
  const hasActiveItem = items.some((item) =>
    item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
  );

  const activeColor = accentActiveColors[accentColor];

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
          hasActiveItem
            ? activeColor
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          className
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown
          className={cn('w-3 h-3 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[180px] py-1 rounded-lg border border-border bg-popover shadow-lg z-50"
          role="menu"
        >
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isItemActive =
              item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);

            const itemContent = (
              <>
                {ItemIcon && <ItemIcon className="w-4 h-4" />}
                <span>{item.label}</span>
                {item.external && <ExternalLink className="w-3 h-3 opacity-50 ml-auto" />}
              </>
            );

            const itemClasses = cn(
              'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-200',
              isItemActive
                ? activeColor
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            );

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={itemClasses}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  {itemContent}
                </a>
              );
            }

            return (
              <a
                key={item.href}
                href={item.href}
                className={itemClasses}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                {itemContent}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
