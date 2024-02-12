export class Forecast{

    #_KEY = "a65a3f613545bf5b9fac5ec4b39fe7bd"

    async loadForecast(city) {
       if(city){
           const response = await fetch(`http://api.openweathermap.org/data/2.5/forecast?units=metric&q=${city}&appid=${this.#_KEY}`);

           return await response.json();
       }
    }
}