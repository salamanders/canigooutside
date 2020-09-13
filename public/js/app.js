/*global console, interpolate, distance */
/*global aqiFromPM, getAQIDescription */
/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*jshint -W097 */

const sleep = (ms=1000) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// TODO: It breaks with `data":[],\n[`, maybe possible to hack the JSON?
const fetchJson = async (url) => await (await fetch(url)).json();

/** Data compressed into a json.fields/json.data[[]] array */
const fetchJsonArray = async (url) => {
    const json = await fetchJson(url);
    if (!json) {
        throw "Unable to fetch the JSON file, stopping.";
    }
    const fields = json.fields;
    console.debug(`Fields: ${JSON.stringify(fields)}`);
    const reducer = (accumulator, currentValue, currentIndex) => {
        accumulator[fields[currentIndex]] = currentValue;
        return accumulator;
    };
    return json.data.map(row => row.reduce(reducer, {}));
};

const getPosition = async () => {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
                enableHighAccuracy: true
            }
        );
    });
};


const getNearbySensors = async (latitude, longitude, n = 10) => {
    const myStorage = window.localStorage;
    let sensorsJson = myStorage.getItem('sensors');
    const age = myStorage.getItem('age');
    const oldestAge = (new Date()).getTime() - (1000 * 60 * 60 * 24 * 7); // 1 week
    if (!sensorsJson || !age || Number(age) < oldestAge) {
        console.debug('Refreshing sensor locations (slow).');
        const allSensors = await fetchJsonArray('https://www.purpleair.com/data.json');
        console.info(`Count of all PurpleAir sensors: ${allSensors.length}`);
        const outsideSensors = allSensors.filter(sensor => sensor.Type == 0 && sensor.pm_1 > 0);
        console.info(`Count of outside sensors with pm_1: ${outsideSensors.length}`);
        sensorsJson = JSON.stringify(outsideSensors.map(sensor => {
            return {
                'Lat': sensor.Lat,
                'Lon': sensor.Lon,
                'ID': sensor.ID
            };
        }));
        myStorage.setItem('sensors', sensorsJson);
        myStorage.setItem('age', (new Date()).getTime());
        sleep(2000); // Avoid rate limiting.
    } else {
        console.debug('Loaded sensor locations from localStorage cache.');
    }

    const outsideSensors = JSON.parse(sensorsJson);
    outsideSensors.forEach(sensor => {
        sensor.distance = distance(latitude, longitude, sensor.Lat, sensor.Lon);
    });
    outsideSensors.sort((a, b) => a.distance - b.distance);

    const nearbyIds = outsideSensors.slice(0, n).map(sensor => sensor.ID);
    console.log('nearbyIds', nearbyIds);

    // Reapply distances
    const nearbySensors = await fetchJsonArray('https://www.purpleair.com/data.json?show=' + nearbyIds.join("|"));
    nearbySensors.forEach(sensor => {
        sensor.distance = distance(latitude, longitude, sensor.Lat, sensor.Lon);
    });
    return nearbySensors;
};


const nearybyToAnswer = (latitude, longitude, nearbys) => {
    const answer = document.getElementById('answer');
    const reason = document.getElementById('reason');
    const nearestSensor = nearbys[0];
    console.log('nearestSensor', nearestSensor);
    const nearestPM25 = Number(nearestSensor.pm_1);
    console.log(`nearestSensor PM2.5=${nearestPM25}`);

    // interpolate
    const data = nearbys.map(sensor => {
        return {
            'x': sensor.Lon,
            'y': sensor.Lat,
            'v': Number(sensor.pm_1)
        };
    });
    const interpPM25 = interpolate(
        {'x': longitude, 'y': latitude},
        data
    );
    console.log(`i=Interpolated PM2.5=${interpPM25}`);

    const worstPm = Math.max(interpPM25, nearestPM25);
    const aqi = aqiFromPM(worstPm);
    const [aqiName, aqiDesc] = getAQIDescription(aqi);

    answer.classList.remove('maybe');
    let moreLess = '';
    if (aqi < 151) {
        answer.classList.add('yes');
        answer.textContent = 'Yes';
        moreLess = 'less';
    } else {
        answer.classList.add('no');
        answer.textContent = 'No';
        moreLess = 'more';
    }
    const distKm = nearestSensor.distance.toFixed(1);
    reason.innerHTML = `<a href="https://purpleair.com">PurpleAir</a> sensors (~${distKm}km away)<br>
say the Air Quality Index is<br>
${aqi} (${aqiName})<br>
<small>
  (pm2.5 is between ${Math.round(interpPM25)} and ${Math.round(nearestPM25)})<br>
  <i>${aqiDesc}</i>
</small>`;
};


const main = async () => {
    const position = await getPosition();
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    console.info(`User position: ${latitude}, ${longitude}`);

    const nearbys = await getNearbySensors(latitude, longitude);
    nearybyToAnswer(latitude, longitude, nearbys);
};


main().then(() => {
    console.info('Script completed.');
}).catch(e => {
    console.warn(e);
    alert('Drat, something broke.  Please check the console and tell Benjamin.');
});

