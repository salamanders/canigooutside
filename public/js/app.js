/*global console, interpolate, distance */
/*global aqiFromPM, getAQIDescription */
/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*jshint -W097 */

/**
 * @param {string} url
 * @return {Object}
 */
const fetchJson = async (url) => {
    /** @type {Body} */
    const response = await fetch(url);
    try {
        return await response.clone().json();
    } catch (e) {
        console.warn("Problem parsing json.  Trying hack to fix.");
        console.warn(e);
        /** @type {string} */
        const rawText = await response.text();
        /** @type {string} */
        const fixedText = rawText.replace('data":[]', 'data":[');
        try {
            return JSON.parse(fixedText);
        } catch (e) {
            console.warn("Hack failed.");
            console.debug(rawText);
            throw "Unable to parse purpleair JSON.";
        }
    }
};


/**
 * Data compressed into a json.fields/json.data[[]] array
 * @param {string} url
 * @return {Object}
 */
const fetchJsonArray = async (url) => {
    const json = await fetchJson(url);
    if (!json) {
        throw "Unable to fetch the JSON file, stopping.";
    }
    const {fields, data} = json;
    console.debug(`Fields: ${JSON.stringify(fields)}`);
    const reducer = (accumulator, currentValue, currentIndex) => {
        accumulator[fields[currentIndex]] = currentValue;
        return accumulator;
    };
    return data.map(row => row.reduce(reducer, {}));
};


/**
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} n
 * @return {Promise<Object[]>}
 */
const getNearbySensors = async (latitude, longitude, n = 10) => {
    const myStorage = window.localStorage;
    let sensorsJson = myStorage.getItem('sensors');
    const age = myStorage.getItem('age');
    const oldestAge = (new Date()).getTime() - (1000 * 60 * 60 * 24 * 7); // 1 week

    if (!sensorsJson || !age || Number(age) < oldestAge) {
        console.debug('Refreshing sensor locations (slow).');
        const allSensors = await fetchJsonArray('data/data.json'); // mirror of 'https://www.purpleair.com/data.json'
        console.info(`Count of all PurpleAir sensors: ${allSensors.length}`);
        const outsideSensors = allSensors.filter(sensor => sensor.Type === 0 && sensor.pm_1 > 0);
        console.info(`Count of outside sensors with pm_1: ${outsideSensors.length}`);
        sensorsJson = JSON.stringify(outsideSensors.map(sensor => {
            return {
                'Lat': sensor.Lat,
                'Lon': sensor.Lon,
                'ID': sensor.ID
            };
        }));
        myStorage.setItem('sensors', sensorsJson);
        myStorage.setItem('age', (new Date()).getTime().toString());
        // nearbySensors = allSensors; // Preload the result, so we don't call twice and get rate-limited.
    } else {
        console.debug('Loaded sensor locations from localStorage cache.');
    }

    console.debug(`Converting from outside sensor locations to a short list of nearby sensors.`);
    const outsideSensors = JSON.parse(sensorsJson);
    outsideSensors.forEach(sensor => {
        sensor.distance = distance(latitude, longitude, sensor.Lat, sensor.Lon);
    });
    outsideSensors.sort((a, b) => a.distance - b.distance);

    const nearbyIds = outsideSensors.slice(0, n).map(sensor => sensor.ID);
    console.debug(`Loading ${nearbyIds.length} nearby sensors.`);
    console.log('nearbyIds', nearbyIds);

    /** @type {Object[]} */
    const nearbySensors = await fetchJsonArray('https://www.purpleair.com/data.json?show=' + nearbyIds.join("|"));

    // Sort by distance and slice
    nearbySensors.forEach(sensor => {
        sensor.distance = distance(latitude, longitude, sensor.Lat, sensor.Lon);
    });
    nearbySensors.sort((a, b) => a.distance - b.distance);
    return nearbySensors.slice(0, n);
};

/**
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {Object[]} nearbys
 */
const nearbyToAnswer = (latitude, longitude, nearbys) => {
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

    answer.classList.remove('loader');
    answer.classList.remove('maybe');
    if (aqi < 151) {
        answer.classList.add('yes');
        answer.textContent = 'Yes';
    } else {
        answer.classList.add('no');
        answer.textContent = 'No';
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
    const {latitude, longitude} = position.coords;
    console.info(`User position: ${latitude}, ${longitude}`);

    const nearbys = await getNearbySensors(latitude, longitude);
    nearbyToAnswer(latitude, longitude, nearbys);
};


main().then(() => {
    console.info('Script completed.');
}).catch(e => {
    console.warn(e);
    alert(`Drat, something broke.  Please tell Benjamin that '${e.message}'`);
});

