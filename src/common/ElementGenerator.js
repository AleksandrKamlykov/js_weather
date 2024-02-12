export class ElementGenerator {
    tagName;
    clasName;
    options;
    constructor(tagName, clasName, options) {
        this.clasName = clasName;
        this.options = options;
        this.el = document.createElement(tagName);

    }

    render() {
        if (this.clasName) {
            this.clasName.split(" ").forEach(cls => cls && this.el.classList.add(cls));
        }
        if (this.options) {
            Object.keys(this.options).forEach(prop => {
                this.el[prop] = this.options[prop];
            });
        }
        return this.el;
    }
}