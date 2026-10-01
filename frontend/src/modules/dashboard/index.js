export default {
  id: "dashboard",
  routeName: "home", // nom de route historique, utilisé par la redirection "attrape-tout"
  order: 10,
  name: "DashBoard",
  icon: "fas fa-chart-pie",
  path: "/",
  title: "Dashboard",
  subtitle: "Vue d'ensemble et état du réseau",
  component: () => import("./DashboardView.vue"),
};
