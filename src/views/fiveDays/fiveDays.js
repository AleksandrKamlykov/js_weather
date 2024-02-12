import { View } from "../../common/view.js";
import { ElementGenerator } from "../../common/ElementGenerator.js";
import {Hourly} from "../../components/hourly/hourly.js";
import {ForecastCard} from "../../components/forecastCard/forecastCard.js";
import "./fiveDays.css"
import {Header} from "../../components/header/header.js";
import {Search} from "../../components/search/search.js";

export class FiveDaysView extends View {

    state = {
        list: [],
        loading: false,
        searchQuery: undefined,
        offset: 0,
        weather: null,
        hourly: []
    };
    constructor(appState,cityHandler) {
        super();
        this.setTitle("Five Days weather");
        this.appState = appState;
        this.state.weather = appState.forecast?.list?.[0]
        this.state.hourly = appState.forecast?.list ?? []
        this.cityHandler = cityHandler
    }

    initHeader(){
        const header = new Header().render()

        const search = new Search(this.appState,this.cityHandler).render()
        header.append(search)

        this.main.append(header)
    }

    renderList(){
            const wrapper = new ElementGenerator("div", "forecast-wrapper").render()
      this.appState.forecast &&  Object.values(this.appState.forecastDict).forEach((forecastArr)=>{

            const moment =forecastArr[Math.floor(forecastArr.length / 2)]
            const card = new ForecastCard(moment, this.appState).render()

            wrapper.append(card)



        })

        return wrapper

    }
    renderHourly(weather){
        const hourly = new Hourly(weather,this.appState).render()

        return hourly

    }

    render() {
        this.main = new ElementGenerator("div").render();
        this.initHeader()
        this.main.classList.add("fiveDays")
        this.app.innerHTML = "";
        const forecast = this.renderList()
        this.main.append(forecast)
   if(this.state.hourly.length > 0){
       const hourly = this.renderHourly( this.state.hourly)
       this.main.append(hourly)
   }

        this.app.append(this.main);

    }

    destroy() {
        this.main.remove();
    }
}