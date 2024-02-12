import { ElementGenerator } from "./ElementGenerator";
import "./common.css";

export class View {

    constructor(needLayout = true) {
        this.app = document.querySelector("#root");
        if (needLayout) {

            const layout = this.initLayot();
            this.app.append(layout);
            this.app = layout;

        }
    }

    setTitle(title) {
        document.title = title;
    }

    initLayot() {
        return new ElementGenerator('div', "layout").render();

    }

    render() {
        return;
    }
    destroy() {
        return;
    }
}