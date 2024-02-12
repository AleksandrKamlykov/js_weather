import { DivComponent } from "../../common/div-component.js";
import "./header.css";
import { ElementGenerator } from "../../common/ElementGenerator.js";

export class Header extends DivComponent {

    menuList = [
        {
            src: "../../../static/assets/search.png",
            textContent: "Now",
            alt: "main forecast",
            href: "#"
        }, {
            src: "../../../static/assets/favorites_dark.svg",
            textContent: "Five days",
            alt: "forecast to five days",
            href: "#fiveDays"

        },
    ];

    constructor(appState) {
        super('header');
        this.appState = appState;
    }

    initMenu() {

        const menu = new ElementGenerator('nav', 'menu').render();

        this.menuList.forEach(item => {
            const itemMenu = new ElementGenerator('a', "menu__item", {
                textContent: item.textContent,
                href: item.href
            }).render();

            const icon = new ElementGenerator('img', undefined, {
                src: item.src,
                alt: item.alt
            }).render();
            itemMenu.prepend(icon);

            menu.append(itemMenu);
        });


        this.el.append(menu);
    }



    render() {
        this.el.innerHTML = "";
        this.el.classList.add("header");


        this.initMenu();

        return this.el;
    }
}