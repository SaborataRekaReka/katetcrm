import { AppShell } from './components/shell/AppShell';
import { LeadsKanbanPage } from './components/kanban/LeadsKanbanPage';
import { ApplicationsWorkspacePage } from './components/application/ApplicationsWorkspacePage';
import { ReservationsWorkspacePage } from './components/reservation/ReservationsWorkspacePage';
import { ClientsWorkspacePage } from './components/client/ClientsWorkspacePage';
import { DeparturesWorkspacePage } from './components/departure/DeparturesWorkspacePage';
import { CompletionWorkspacePage } from './components/completion/CompletionWorkspacePage';
import { HomeWorkspacePage } from './components/home/HomeWorkspacePage';
import { CatalogsWorkspacePage } from './components/catalogs/CatalogsWorkspacePage';
import { ControlWorkspacePage } from './components/control/ControlWorkspacePage';
import { AdminWorkspacePage } from './components/admin/AdminWorkspacePage';
import { ModulePlaceholder } from './components/shell/ModulePlaceholder';
import { useLayout } from './components/shell/layoutStore';
import { useAuth } from './auth/AuthProvider';
import { LoginScreen } from './auth/LoginScreen';

function RouteOutlet() {
  const { activeSecondaryNav } = useLayout();
  const LEADS_IDS = new Set([
    'leads',
    'my-leads',
    'view-urgent',
    'view-no-contact',
    'view-to-application',
    'view-needs-reservation',
    'view-stale',
    'view-duplicates',
  ]);
  const APPLICATIONS_IDS = new Set([
    'applications',
    'my-applications',
    'apps-no-reservation',
    'apps-ready',
  ]);
  const RESERVATIONS_IDS = new Set([
    'reservations',
    'view-conflict',
    'view-need-confirm',
    'view-no-unit',
    'view-no-subcontractor',
    'view-ready-departure',
    'view-released',
  ]);
  const CLIENTS_IDS = new Set([
    'clients',
    'clients-new',
    'clients-repeat',
    'clients-vip',
    'clients-debt',
  ]);
  const DEPARTURES_IDS = new Set([
    'departures',
    'view-departures-today',
    'view-overdue-departures',
  ]);
  const COMPLETION_IDS = new Set(['completion', 'view-no-completion']);
  const HOME_IDS = new Set(['overview', 'my-tasks', 'urgent-today', 'recent-activity', 'quick-links']);
  const CATALOGS_IDS = new Set([
    'equipment-types',
    'equipment-units',
    'subcontractors',
    'equipment-categories',
  ]);
  const CONTROL_IDS = new Set([
    'dashboard',
    'reports',
    'audit',
    'view-stale-leads',
    'view-lost-leads',
    'view-active-reservations',
    'view-manager-load',
  ]);
  const ADMIN_IDS = new Set(['imports', 'settings', 'users', 'permissions']);

  if (LEADS_IDS.has(activeSecondaryNav)) return <LeadsKanbanPage />;
  if (APPLICATIONS_IDS.has(activeSecondaryNav)) return <ApplicationsWorkspacePage />;
  if (RESERVATIONS_IDS.has(activeSecondaryNav)) return <ReservationsWorkspacePage />;
  if (CLIENTS_IDS.has(activeSecondaryNav)) return <ClientsWorkspacePage />;
  if (DEPARTURES_IDS.has(activeSecondaryNav)) return <DeparturesWorkspacePage />;
  if (COMPLETION_IDS.has(activeSecondaryNav)) return <CompletionWorkspacePage />;
  if (HOME_IDS.has(activeSecondaryNav)) return <HomeWorkspacePage />;
  if (CATALOGS_IDS.has(activeSecondaryNav)) return <CatalogsWorkspacePage />;
  if (CONTROL_IDS.has(activeSecondaryNav)) return <ControlWorkspacePage />;
  if (ADMIN_IDS.has(activeSecondaryNav)) return <AdminWorkspacePage />;
  return <ModulePlaceholder />;
}

export default function App() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Загрузка…
      </div>
    );
  }
  if (status === 'anonymous') return <LoginScreen />;
  return (
    <AppShell>
      <RouteOutlet />
    </AppShell>
  );
}