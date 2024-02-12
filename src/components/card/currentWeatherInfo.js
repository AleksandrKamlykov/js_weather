import { ElementGenerator } from "../../common/ElementGenerator";
import { DivComponent } from "../../common/div-component";
import "./currentWeatherInfo.css";

export class CurrentWeatherInfo extends DivComponent {

    constructor(currentWeatherState, appState) {
        super();
        this.currentWeatherState = currentWeatherState;
        this.appState = appState;
    }



    initInfo() {
        const weather = this.currentWeatherState

        const timeFormatter = new Intl.DateTimeFormat("ru-RU",{
            hour: "numeric",
            minute: "numeric",
        })

        const infoWrapper = new ElementGenerator('div',"card").render();

        const now = new Date();
        const day = now.getDate(), month = ("0" + (now.getMonth() + 1)).slice(-2), year = now.getFullYear();

        const blockHead = new ElementGenerator("div", "block-head").render();
        const blockTitle = new ElementGenerator("h3", "primary-text-title", { innerText: "CurrentWeather" }).render();
        const blockTime = new ElementGenerator("span", "time", { innerText: `${day}.${month}.${year}` }).render();



        const currentWeatherLayout = new ElementGenerator("div", 'current-weather-layout').render();

        const currentWeatherImgLayout = new ElementGenerator("div",'current-layout-img' ).render();
        const currentWeatherImg = new ElementGenerator("img", 'weather-img', { src: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png` }).render();
        const currentWeatherImgDescription = new ElementGenerator("p", 'weather-description', { innerText: weather.weather[0].main }).render();
        currentWeatherImgLayout.append(currentWeatherImg)
        currentWeatherImgLayout.append(currentWeatherImgDescription)

        currentWeatherLayout.append(currentWeatherImgLayout);

        const currentWeatherTemp = new ElementGenerator("div", "degree-wrapper").render();

        const formattedCurrentTemperature = new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }).format(weather.main.temp);

        const resultCurrentTemperature = `${formattedCurrentTemperature}°C`;


        const formattedFeelTemperature = new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }).format(weather.main.feels_like);

        const resultFeelTemperature = `${formattedFeelTemperature}°C`;

        const currentDegree = new ElementGenerator("p", "current-degree", { innerText: resultCurrentTemperature }).render();
        const realFeel = new ElementGenerator("p", "current-real-feel", { innerText: `Real feel: ${resultFeelTemperature}` }).render();

        const sunriseLayout = new ElementGenerator("div", "sun-info-wrapper").render()
        const sunriseTitle = new ElementGenerator("span", "sun-info-child",{innerText:"Sunrise:"}).render()
        const sunriseValue = new ElementGenerator("span", "sun-info-child",{innerText: timeFormatter.format(new Date((this.appState.forecast.city.sunrise ?? 0) * 1000)) }).render()

        const sunsetLayout = new ElementGenerator("div", "sun-info-wrapper").render()
        const sunsetTitle = new ElementGenerator("span", "sun-info-child",{innerText:"Sunset:"}).render()
        const sunsetValue = new ElementGenerator("span", "sun-info-child",{innerText: timeFormatter.format(new Date((this.appState.forecast.city.sunset ?? 0) * 1000)) }).render()

      const sunInfo = new ElementGenerator("div", "sun-info").render()

        sunriseLayout.append(sunriseTitle)
        sunriseLayout.append(sunriseValue)
        sunsetLayout.append(sunsetTitle)
        sunsetLayout.append(sunsetValue)


        sunInfo.append(sunriseLayout)
        sunInfo.append(sunsetLayout)

        currentWeatherTemp.append(currentDegree)
        currentWeatherTemp.append(realFeel)
        currentWeatherLayout.append(currentWeatherTemp)

        blockHead.append(blockTitle);
        blockHead.append(blockTime);

        infoWrapper.append(blockHead);
        infoWrapper.append(currentWeatherLayout);

        currentWeatherLayout.append(sunInfo)

        return infoWrapper;
    }

    render() {
       // this.el.classList.add("card__wrapper");

        const info = this.initInfo();

        this.el.append(info);

        return this.el;
    }

}