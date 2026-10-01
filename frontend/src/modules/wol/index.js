export default {
  id: "wol",
  order: 20,
  name: "Wake On Lan",
  icon: "fas fa-network-wired",
  path: "/wol",
  title: "Wake On Lan",
  subtitle: "Envoi de paquets magiques WOL",
  component: () => import("./WolView.vue"),
};
