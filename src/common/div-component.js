export class DivComponent {
    constructor(tag) {
        this.el = document.createElement(tag ||'div')
    }

    render(){
       return this.el
    }
}