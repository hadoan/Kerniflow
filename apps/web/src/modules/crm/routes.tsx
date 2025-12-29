import DealsPage from "./screens/DealsPage";
import DealDetailPage from "./screens/DealDetailPage";
import ActivitiesPage from "./screens/ActivitiesPage";

export const crmRoutes = [
  {
    path: "/crm/deals",
    element: <DealsPage />,
  },
  {
    path: "/crm/deals/:id",
    element: <DealDetailPage />,
  },
  {
    path: "/crm/activities",
    element: <ActivitiesPage />,
  },
];
