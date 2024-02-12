import { DivComponent } from "../../common/div-component.js";
import "./search.css";
import { ElementGenerator } from "../../common/ElementGenerator.js";

export class Search extends DivComponent {

    constructor(state,cityHandler) {
        super();
        this.state = state;
        this.searchHandler = cityHandler

    }

    search() {
        const value = this.el.querySelector(".search__input").value;
        this.searchHandler(value)
    }

    inputInit() {
        const input = new ElementGenerator('input', 'search__input', {
            placeholder: "City"
        }).render();

        input.addEventListener("keydown", (event) => {
            if (event.code === "Enter") {
                this.search();
            }
        });

        return input;
    }

    inititIcon() {
        const icon = new ElementGenerator("img", "search__icon", {
            src: "../../../static/assets/search.png",
            alt: "search icon",
            width: 24,
            height: 24,
        }).render();

        return icon;
    }

    initButton() {
        const button = new ElementGenerator('button', 'search__button',).render();

        const icon = new ElementGenerator("img", "search__icon__button", {
            src: "../../../static/assets/search.svg",
            alt: "search icon",
            width: 28,
            height: 28
        }).render();

        button.addEventListener("click", this.search.bind(this));


        button.append(icon);

        return button;
    }

    render() {
        this.el.classList.add("search-wrapper");


        const input = this.inputInit();
        this.el.append(input);

        const icon = this.inititIcon();
        this.el.append(icon);

        const button = this.initButton();
        this.el.append(button);

        return this.el;
    }
}