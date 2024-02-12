import { View } from "../../common/view.js";
import onChange from "on-change";
import { ElementGenerator } from "../../common/ElementGenerator.js";
import {CurrentWeatherInfo} from "../../components/card/currentWeatherInfo.js";
import {Hourly} from "../../components/hourly/hourly.js";
import {Header} from "../../components/header/header.js";
import {Search} from "../../components/search/search.js";

export class MainView extends View {

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
        this.setTitle("Today weather");
        this.appState = appState;
        this.appState = onChange(this.appState, this.appStateHook.bind(this));
        this.state = onChange(this.state, this.stateHook.bind(this));
        this.state.weather = appState.forecast?.list?.[0]
        this.state.hourly = appState?.forecast?.list ?? []
this.cityHandler = cityHandler
    }


    appStateHook(path) {

        if (path === "favorites") {
            this.render();
            this.renderList();
        }
    }
    async stateHook(path) {

        if (path === "searchQuery") {

            this.state.loading = true;
            const data = await this.loadList(this.state.searchQuery, this.state.offset);

            this.state.loading = false;
            this.state.list = data.docs.concat();
        }
        if (path === "list" || path === "loading") {
            this.renderList();
        }
    }


    renderCurrentInfo(){
        const currentInfo = new CurrentWeatherInfo(this.state.weather, this.appState).render()

        this.main.append(currentInfo)
    }

    renderHourly(){
        const hourly = new Hourly(this.state.hourly, this.appState).render()
        this.main.append(hourly)
    }

    initHeader(){
        const header = new Header().render()

        const search = new Search(this.appState,this.cityHandler).render()
        header.append(search)

      this.main.append(header)
    }

    render() {
        this.main = new ElementGenerator("div").render();
        this.main.classList.add("today-wrapper")
        this.app.innerHTML = "";
        this.initHeader()
        if (this.state.weather){
            this.renderCurrentInfo()
        }
        if (this.state.hourly.length > 0){
            this.renderHourly()
        }
        this.app.append(this.main);

    }

    destroy() {
        this.main.remove();
    }
}