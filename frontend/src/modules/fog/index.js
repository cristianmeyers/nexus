export default {
  id: "fog",
  order: 30,
  name: "Fog Image Viewer",
  icon: "fas fa-images",
  path: "/fog",
  title: "Fog Image Viewer",
  subtitle: "Gestion des images FOG Project",
  component: () => import("./FogView.vue"),
};
