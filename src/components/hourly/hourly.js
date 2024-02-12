import {DivComponent} from "../../common/div-component.js";
import {ElementGenerator} from "../../common/ElementGenerator.js";
import "./hourly.css"

const tableRules =[
    ["dt_txt"],
    [ "weather", 0 ,"main"],
    ["main", "temp"],
    ["main", "feels_like"],
    ["wind","speed"]

]
const columns =[ "Time", "Weather", "Degree", "Feels like", "Winter"]
export class Hourly extends DivComponent{

    constructor(hourly, appState) {
        super();

        this.hourly = hourly?.slice(0,8) ?? [];
        this.appState = appState;
    }

    initTitle(){

        const title = new ElementGenerator("div","block-head" ).render()

        const blockTitle = new ElementGenerator("h3", "primary-text-title", { innerText: "Hourly" }).render();

        title.append(blockTitle)

        return title

    }

    prepareData(){

        const res = this.hourly.map((weather,index)=>{

            const w = tableRules.map((path,index)=>{

                const value ={
                    value:this.getValueByNestedKeys(weather,path),
                    column:columns[index]
                }

                return value
            })


            return w
        })

        return res

    }

    initHourly(){
        const hourlyWrapper = new ElementGenerator("div","hourly-wrapper").render()

        const hourlyTable = new ElementGenerator("table", "hourly-table").render()
        const hourlyHead = new ElementGenerator("thead").render()
        const hourlyBody= new ElementGenerator("tbody").render()


            const c = this.renderRow(columns.map(col=>({column:col,value:col})),true)
        hourlyHead.append(c)


        const d = this.prepareData()


       d.forEach(values=>{

           const rowHeader = this.renderRow(values )


           hourlyBody.append(rowHeader)

       })

        hourlyTable.append(hourlyHead)
        hourlyTable.append(hourlyBody)

hourlyWrapper.append(hourlyTable)

        return hourlyWrapper
    }

     getValueByNestedKeys(object, keys) {
        try {
            let value = object;

            for (const key of keys) {
                value = value[key];
            }

            return value;
        } catch (error) {
            console.error('Error:', error);
            return undefined;
        }
    }

    renderRow(cells,isHeader){
         const row = new ElementGenerator("tr", "hourly-row").render()



        cells.forEach(value=>{

            const cell = this.renderCell(value,isHeader)

            row.append(cell)


        })

        return row
    }

    renderCell({value,column} , isHeader){

        let data = value

        if(!isHeader){
            switch (column){
                case "Time":
                    data = value.slice(-9,-3)
                    // data = new Intl.DateTimeFormat("ru-RU",{
                    //     hour: "numeric",
                    //     minute: "numeric",
                    // }).format(new Date(value * 1000))
                    break
                case "Degree" :
                    data = new Intl.NumberFormat('en-US', {
                        style: 'unit',
                        unit: 'celsius',
                    }).format(value)
                    break
                case "Feels like" :
                    data = new Intl.NumberFormat('en-US', {
                        style: 'unit',
                        unit: 'celsius',
                    }).format(value)
                    break
                case "Winter" :
                    data = `${value} SE`
                    break
                default:
                    data = value
            }
        }


        return new ElementGenerator(isHeader?"th":"td", "hourly-cell", {innerText: data}).render()
    }


    render(){

        this.el.classList.add("card")

        const hour = this.initHourly()
        const title = this.initTitle()


        this.el.append(title)
        this.el.append(hour)



        return this.el
    }
}