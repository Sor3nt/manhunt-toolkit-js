export default class NQuery {


    callbacks = {};
    createdEvents = {};

    /**
     *
     * @param element {HTMLElement|String}
     */
    constructor( element = null ) {
        if (typeof element === "string"){
            this.element = document.createElement(element)
        }
        else
            this.element = element || document;
    }

    /**
     *
     * @param action {string}
     * @param callback {function}
     * @param selector {string|null}
     * @returns {NQuery}
     */
    on( action, callback, selector = null) {
        if (selector === null)
            this.element.addEventListener(action, callback, false);
        // else

        return this;
    }

    off( action, callback) {
        this.element.removeEventListener(action, callback, false);
        // else

        return this;
    }

    /**
     *
     * @param selector {string}
     * @returns {NQuery|null}
     */
    find( selector ) {
        const node = this.element.querySelector(selector);
        return node ? new NQuery(this.element.querySelector(selector)) : null;
    }

    /**
     * @param selector {string}
     * @returns {NodeListOf<*>}
     */
    findAll( selector ) {

        return this.element.querySelectorAll(selector);
    }

    data( attribute ) {
        return this.element.dataset[attribute] === undefined ? null : this.element.dataset[attribute];
    }


    append( node ){
        this.element.appendChild( node instanceof NQuery ? node.element : node);
    }

    prepend( node ) {
        this.element.prepend(node instanceof NQuery ? node.element : node);
    }

    /**
     * @returns {NQuery}
     */
    show(){
        this.element.style.display = "block";
        return this;
    }

    /**
     * @returns {NQuery}
     */
    hide(){
        this.element.style.display = "none";
        return this;
    }

    /**
     *
     * @param content {string|int|null}
     * @returns {NQuery|string}
     */
    html( content = null ){
        if (content === null)
            return this.element.innerHTML;

        this.element.innerHTML = content;
        return this;
    }

    /**
     *
     * @param name {string}
     * @param value {string|int|null}
     * @returns {string|NQuery}
     */
    attr( name, value = null){
        if (value === null)
            return this.element.getAttribute(name);

        this.element.setAttribute(name, value);
        return this;
    }

    hasClass( name ){
        return this.element.className.indexOf(name) > -1
    }

    addClass( name ) {
        this.element.classList.add(name);
        return this;
    }

    removeClass( name ) {
        this.element.classList.remove(name);
        return this;
    }

    serialize() {
        let field, s = [];
        // Loop through the form's elements collection
        for (let i = 0; i < this.element.elements.length; i++) {
            field = this.element.elements[i];
            // Don't include the submit button or fields that are disabled
            if (field.name && !field.disabled && field.type !== 'file' && field.type !== 'reset' && field.type !== 'submit') {
                // If the field is a checkbox or radio button and it's not checked, skip it
                if (field.type === 'checkbox' || field.type === 'radio') {
                    if (!field.checked) continue;
                }
                // Encode the field's name and value and add them to the query string
                s.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value));
            }
        }
        // Return the serialized form data as a string
        return s.join('&');
    }

    clone(){
        return nQuery(this.element.cloneNode(true));
    }

    /**
     *
     * @param value {string|null}
     * @returns {NQuery|*}
     */
    val( value = null ) {
        if (value === null) return this.element.value;
        this.element.value = value;
        return this;
    }

    remove() {
        this.element.remove();
    }

    /**
     *
     * @param selector {string}
     * @returns {null|NQuery}
     */
    closest( selector ) {
        const node = this.element.closest(selector);
        if (node === null)
            return null;

        return new NQuery(node);
    }


    /**
     *
     * @param action {string}
     * @param selector {string}
     * @param callback {function}
     * @returns {NQuery}
     */
    live( action, selector, callback) {

        if (this.callbacks[action] === undefined)
            this.callbacks[action] = {};

        if (this.callbacks[action][selector] === undefined)
            this.callbacks[action][selector] = [];

        this.callbacks[action][selector].push(callback);

        if (this.createdEvents[action] === undefined) {
            this.element.addEventListener(action, (e) => this.#onActionEvent(action, e));
            this.createdEvents[action] = true;
        }

        return this;
    }

    /**
     *
     * @param action {string}
     * @param event {Event}
     */
    #onActionEvent(action, event) {
        for( let selector in this.callbacks[action])
            if (event.target.closest(selector))
                this.callbacks[action][selector].forEach((callback) => callback(event));
    }

}
