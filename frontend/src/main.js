import "./style.css";
import { createApp } from "vue";
import { createPinia } from "pinia"; // 1. Importer Pinia
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(createPinia()); // 2. Activer Pinia
app.use(router);

app.mount("#app");
