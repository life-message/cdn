import "./pages/menu.js";
import "./pages/templates.js";
import notification from "./notification.js";
import { initNavigation } from "./ui/header.js";
import "./ui/color.js";
import "./utils/localstorage.js";
import "./utils/svg.js";
import "./utils/watch.js";
import "./ui/switcher.js";
import "./ui/lines.js";

globalThis.notification = notification;

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
});

export { notification };
export default notification;
