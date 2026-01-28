import ListManager from "./ListManager.js";
window.Twitch.ext.onAuthorized(auth => {
    const manager = new ListManager(auth);
    manager.start();
});