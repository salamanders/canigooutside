/*global console, interpolate, distance */
/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*jshint -W097 */

const fetchJson = async (url) => await (await fetch(url)).json();

/** Data compressed into a json.fields/json.data[[]] array */
const fetchJsonArray = async (url) => {
    const json = await fetchJson(url);
    const fields = json.fields;
    const reducer = (accumulator, currentValue, currentIndex) => {
        accumulator[fields[currentIndex]] = currentValue;
        return accumulator;
    };
    return json.data.map(row => row.reduce(reducer));
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

async function main() {
    const answer = document.getElementById('answer');
    const reason = document.getElementById('reason');
    const maxAgeSeconds = 60 * 60 * 2; // 2 hours

    const [position, allSensors] = await Promise.all([getPosition(), fetchJsonArray('https://www.purpleair.com/data.json')]);

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    console.info(`User position: ${latitude}, ${longitude}`);

    console.info(`PurpleAir results: ${allSensors.length}`);

    //["ID","pm","age","pm_0","pm_1","pm_2","pm_3","pm_4","pm_5","pm_6","conf","pm1","pm_10","p1","p2","p3","p4","p5","p6","Humidity","Temperature","Pressure","Elevation","Type","Label","Lat","Lon","Icon","isOwner","Flags","Voc","Ozone1","Adc","CH"],
    //[61385,110.5,1,110.5,111.4,113.1,115.3,135.6,114.0,40.9,100,56.0,131.5,14438.5,4345.2,1351.8,146.7,47.6,6.6,47,77,1010.5,19,0,"EasyStreet",37.3992,-122.06583,0,0,0,null,null,0.03,3],

    const liveSensors = allSensors.filter(sensor =>
        sensor.age < maxAgeSeconds &&
        sensor.pm_1 > 0
    );
    console.info(`liveSensors (<2 hours, 10 minute average): ${liveSensors.length}`);
    liveSensors.forEach(sensor => {
        sensor.distance = Math.round(10.0 * distance(latitude, longitude, sensor.Lat, sensor.Lon)) / 10.0;
    });
    liveSensors.sort((a, b) => a.distance - b.distance);

    const nearbys = liveSensors.slice(0, 10);
    const shortURL = 'https://www.purpleair.com/data.json?show=' + nearbys.map(it => it.ID).join("|");
    console.info(`Short URL: ${shortURL}`);

    const nearestSensor = nearbys[0];
    console.log(nearestSensor);
    const nearestPM25 = Math.round(Number(nearestSensor.pm_1));
    console.log(`PM2.5: Closest=${nearestPM25}`);

    // interpolate
    const data = nearbys.map(sensor => {
        return {
            'x': sensor.Lon,
            'y': sensor.Lat,
            'v': Number(sensor.pm_1)
        };
    });
    const interpPM25 = Math.round(interpolate(
        {'x': longitude, 'y': latitude},
        data
    ));
    console.log(`PM2.5: interp=${interpPM25}`);

    answer.classList.remove('maybe');
    let moreLess = '';
    if (interpPM25 < 100 && nearestPM25 < 100) {
        answer.classList.add('yes');
        answer.textContent = 'Yes!';
        moreLess = 'less';
    } else {
        answer.classList.add('no');
        answer.textContent = 'No.';
        moreLess = 'more';
    }
    reason.innerHTML = `<a href="https://purpleair.com">PurpleAir</a> sensors (~${nearestSensor.distance}km away)<br>
say the PM2.5 is ${moreLess} than 100<br>
(between ${interpPM25} and ${nearestPM25}).`;
}

main().then(() => {
    console.info('Script completed.');
}).catch(e => console.warn(e));

