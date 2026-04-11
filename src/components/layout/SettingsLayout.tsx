/**
 * Settings Layout
 * Full-screen settings view: left menu sidebar + right content.
 * Replaces the main app sidebar when the user enters Settings.
 */
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2, Cpu, BookOpen, MessageSquare } from 'lucide-react';
import { TitleBar } from './TitleBar';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const menuItems = [
  { id: 'general',  path: '/settings',          icon: Settings2,    labelKey: 'general' },
  { id: 'models',   path: '/settings/models',   icon: Cpu,          labelKey: 'models' },
  { id: 'skills',   path: '/settings/skills',   icon: BookOpen,     labelKey: 'skills' },
  { id: 'channels', path: '/settings/channels', icon: MessageSquare, labelKey: 'channels' },
];

export function SettingsLayout() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TitleBar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Settings sidebar */}
        <aside className="flex w-64 shrink-0 flex-col border-r bg-secondary/60 dark:bg-background">
          {/* Back to App */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {t('sidebar.backToApp')}
          </button>

          <div className="mx-3 border-t border-black/5 dark:border-white/5" />

          {/* Menu */}
          <nav className="flex flex-col gap-0.5 p-2 flex-1 pt-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.id === 'general'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors',
                    isActive
                      ? 'bg-black/5 dark:bg-white/10 text-foreground'
                      : 'text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                      strokeWidth={2}
                    />
                    <span>{t(`sidebar.${item.labelKey}`)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Settings content */}
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
