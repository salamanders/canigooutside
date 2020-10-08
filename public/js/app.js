/*global console, interpolate, distance, getPosition, normalizeJson, sleep, requireNumber */
/*global aqiFromPM, getAQIDescription */
/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*jshint -W097 */

/**
 * @param {string} url
 * @param {number=} retryCount
 * @return {Object}
 */
const fetchJson = async (url, retryCount = 0) => {
    /** @type {Response} */
    const response = await fetch(url);

    if ((response.status >= 500 && response.status < 600) || response.status === 429) {
        console.warn(`fetchJson response: ${response.status}`);
        if (retryCount < 1) {
            console.warn('Sleeping then trying again.');
            await sleep(5 * 1000);
            return fetchJson(url, retryCount + 1);
        } else {
            console.error(`Too many retries (${retryCount}).`);
            alert(`PurpleAir may be overloaded, try in 3 minutes.`);
            throw new Error("HTTP " + response.status);
        }
    }

    try {
        // Clone so we can try again if there is a problem.
        return await response.clone().json();
    } catch (e) {
        console.warn("Problem parsing json.  Trying hack to fix.");
        console.warn(e);
        /** @type {string} */
        const rawText = await response.clone().text();
        /** @type {string} */
        const fixedText = rawText.replace('"data":[],', '"data":[');
        try {
            const fixedJson = JSON.parse(fixedText);
            console.info('Hack worked!');
            return fixedJson;
        } catch (e) {
            console.error("Hack failed.");
            console.debug(url);
            console.debug(rawText);
            throw "Unable to parse PurpleAir JSON.";
        }
    }
};


/**
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number=} n
 * @return {Promise<Object[]>}
 */
const getNearbySensors = async (latitude, longitude, n = 10) => {
    requireNumber(latitude);
    requireNumber(longitude);
    requireNumber(n, 1, 100);

    const myStorage = window.localStorage;
    let sensorsJson = myStorage.getItem('sensors');
    const age = myStorage.getItem('age');
    const oldestAge = (new Date()).getTime() - (1000 * 60 * 60 * 24 * 7); // 1 week

    if (!sensorsJson || !age || Number(age) < oldestAge) {
        console.debug('Refreshing sensor locations from static copy of full API results.');

        // mirror of 'https://www.purpleair.com/data.json'
        const allSensors = normalizeJson(await fetchJson('data/data.json'));
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
    const nearbySensors = normalizeJson(await fetchJson('https://www.purpleair.com/data.json?show=' + nearbyIds.join("|")));

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
    requireNumber(latitude);
    requireNumber(longitude);
    requireNumber(nearbys.length, 1);

    const nearestSensor = nearbys[0];
    console.log('nearestSensor', nearestSensor);
    const nearestPM25 = Number(nearestSensor.pm_1);
    console.log(`nearestSensor PM2.5=${nearestPM25}`);

    // interpolate to find averaged quality
    /** @type {?number} */
    let interpPM25 = null;
    try {
        const data = nearbys.map(sensor => {
            return {
                'x': sensor.Lon,
                'y': sensor.Lat,
                'v': Number(sensor.pm_1)
            };
        });
        interpPM25 = interpolate(
            {'x': longitude, 'y': latitude},
            data
        );
        console.log(`i=Interpolated PM2.5=${interpPM25}`);
    } catch(e) {
        console.warn('Problem in interpolation.');
        console.warn(e);
    }

    display(nearestSensor.distance, nearestPM25, interpPM25);
};

/**
 *
 * @param {number} distKm
 * @param {number} pm25s
 */
const display = (distKm, ...pm25s) => {
    requireNumber(distKm);
    const validPm25s = pm25s.filter(Number);
    requireNumber(validPm25s.length, 1);

    const answer = document.getElementById('answer');
    const reason = document.getElementById('reason');

    const bestPm = Math.min(...validPm25s);
    const worstPm = Math.max(...validPm25s);
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

    const range = (Math.round(bestPm) === Math.round(worstPm)) ?
        `~${Math.round(bestPm)}` :
        ` in ${Math.round(bestPm)} to ${Math.round(worstPm)}`;

    reason.innerHTML = `<a href="http://purpleair.com">PurpleAir</a> sensors (~${distKm.toFixed(1)}km away)<br>
say the Air Quality Index is<br>
${aqi} (${aqiName})<br>
<small>
  (pm2.5 is ${range})<br>
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
    alert(`Drat, something broke.  Please try again in 5 minutes.  Tell Benjamin if it keeps happening.`);
});
