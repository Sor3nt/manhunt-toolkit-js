class AppMenu {

    /**
     *
     * @type {App|null}
     */
    activeApp = null;

    /**
     *
     * @type {Element|null}
     */
    container = null;

    /**
     *
     * @param {Element} container
     */
    setContainer(container) {
        this.container = container;
    }

    /**
     *
     * @param {App} app
     */
    add( app ){
        const entry = document.createElement('div');
        entry.innerHTML = app.name;
        entry.onclick = async () => {
            if (this.activeApp === app) return;

            if (this.activeApp)
                this.activeApp.unload();

            await app.load();
            this.activeApp = app;
        }

        this.container.appendChild(entry);
    }

}

export default new AppMenu()