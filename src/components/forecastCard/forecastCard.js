import { ElementGenerator } from "../../common/ElementGenerator";
import { DivComponent } from "../../common/div-component";
import "./forecastCard.css";

export class ForecastCard extends DivComponent {

    constructor(currentWeatherState, appState) {
        super();
        this.currentWeatherState = currentWeatherState;
        this.appState = appState;

    }



    initInfo() {


        const weather = this.currentWeatherState
        const infoWrapper = new ElementGenerator('div', 'card-item').render()
        const dateFormatter = new Intl.DateTimeFormat("en-EN",{
            day: "numeric",
            month: "short",
        })
        const dayFormatter = new Intl.DateTimeFormat("en-EN",{
            weekday: "short",
        })
        const dayName = new ElementGenerator("p", "primary-text-title",{
            textContent: dayFormatter.format(new Date(weather.dt * 1000))
        }).render()


        const dateName = new ElementGenerator("p", "light-text",{
            textContent: dateFormatter.format(new Date(weather.dt * 1000))
        }).render()

        const cardImg = new ElementGenerator('img', "weather-icon",{src:`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}).render()



        infoWrapper.append(dayName)
        infoWrapper.append(dateName)
        infoWrapper.append(cardImg)

        return infoWrapper;
    }



    render() {
         this.el.classList.add("card-wrapper");

        const info = this.initInfo();


        this.el.append(info);

        return this.el;
    }

}