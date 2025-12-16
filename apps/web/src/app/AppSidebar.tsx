import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Moon, Sun, Globe, LogOut } from 'lucide-react';
import { Logo } from '@/shared/components/Logo';
import { Button } from '@/shared/ui/button';
import { moduleRegistry, settingsNavItem, getEnabledModules, getComingSoonModules } from '@/modules/registry';
import { useThemeStore } from '@/shared/theme/themeStore';
import { cn } from '@/shared/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu';
import { getDb } from '@/shared/mock/mockDb';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AppSidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();
  const db = getDb();

  const enabledModules = getEnabledModules();
  const comingSoonModules = getComingSoonModules();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('bizflow-language', lang);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Logo size="md" showText={!collapsed} />
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
        {/* Enabled modules */}
        <div className="space-y-1">
          {enabledModules.flatMap((module) =>
            module.navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{t(item.labelKey)}</span>}
              </NavLink>
            ))
          )}
        </div>

        {/* Coming soon modules */}
        {!collapsed && comingSoonModules.length > 0 && (
          <div className="mt-6">
            <div className="px-3 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('common.comingSoon')}
              </span>
            </div>
            <div className="space-y-1">
              {comingSoonModules.flatMap((module) =>
                module.navItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/40 cursor-not-allowed"
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* Settings */}
        <NavLink
          to={settingsNavItem.path}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )
          }
        >
          <settingsNavItem.icon className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{t(settingsNavItem.labelKey)}</span>}
        </NavLink>

        {/* Controls row */}
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'gap-2 px-2')}>
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => changeLanguage('de')}>
                🇩🇪 Deutsch
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')}>
                🇬🇧 English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User profile */}
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-sm font-medium">
                  {db.user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-sidebar-foreground truncate">
                    {db.user.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {db.tenant.name}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium">{db.user.name}</div>
                <div className="text-xs text-muted-foreground">{db.user.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger">
                <LogOut className="h-4 w-4 mr-2" />
                {t('common.comingSoon')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}
