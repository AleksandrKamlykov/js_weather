import { MainView } from "./views/main/main.js";
import {Forecast} from "./common/Forecast.js";
import {FiveDaysView} from "./views/fiveDays/fiveDays.js";
import onChange from 'on-change';


class App {
    routes = [
        { path: "", view: MainView },
        { path: "fiveDays", view: FiveDaysView }
    ];
    appState = {
        favorites: [],
        forecast: null,
        forecastDict:null,
        city: "",
    };
    constructor() {

        window.addEventListener("hashchange", this.route.bind(this));
        this.route();

        this.appState = onChange(this.appState, this.cityStateHook.bind(this));
    }
    async cityStateHook(path, value, previousValue, applyData) {
        // console.log("______N E W________")
        // console.log('path:', path);
        // console.log('value:', value);
        // console.log('previousValue:', previousValue);
        // console.log('applyData:', applyData);
        if(path === "city"){
            this.loadData(value)
        }

        if (path === "forecast"){
            this.route()
        }
    }

    cityHandler= (value)=>{
        this.appState.city = value
        console.log("handler", this.appState)
    }

    async loadData(city){
        const forecats = await new Forecast().loadForecast(city)
        console.log(forecats)
        const dict ={}

        forecats?.list?.forEach((weather)=>{
            const date = weather.dt_txt.slice(0,10)
            if(dict[date]){
                dict[date].push(weather)
            }else{
                dict[date] = [weather]
            }
        })
        this.appState.forecastDict = dict
        this.appState.forecast = forecats

    }


   async route() {


        if (this.currentView) {
            this.currentView.destroy();
        }

        const { view } = this.routes.find(route => route.path === location.hash.slice(1));

        this.currentView = new view(this.appState,this.cityHandler);

        this.currentView.render();

    }
}

new App();