/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*jshint -W097 */
/*global requireNumber */
/*exported aqiFromPM, getAQIDescription */


// from https://docs.google.com/document/d/15ijz94dXJ-YAZLi9iZ_RaBwrZ4KtYeCy08goGBwnbCU/edit#

/**
 *
 * @param {number} pm
 * @return {string|undefined|number|*}
 */
function aqiFromPM(pm) {
    requireNumber(pm, 0, 1000);
    /*
    Good                              0 - 50         0.0 - 15.0         0.0 – 12.0
    Moderate                        51 - 100           >15.0 - 40        12.1 – 35.4
    Unhealthy for Sensitive Groups   101 – 150     >40 – 65          35.5 – 55.4
    Unhealthy                                 151 – 200         > 65 – 150       55.5 – 150.4
    Very Unhealthy                    201 – 300 > 150 – 250     150.5 – 250.4
    Hazardous                                 301 – 400         > 250 – 350     250.5 – 350.4
    Hazardous                                 401 – 500         > 350 – 500     350.5 – 500
    */
    if (pm > 350.5) {
        return calcAQI(pm, 500, 401, 500, 350.5);
    } else if (pm > 250.5) {
        return calcAQI(pm, 400, 301, 350.4, 250.5);
    } else if (pm > 150.5) {
        return calcAQI(pm, 300, 201, 250.4, 150.5);
    } else if (pm > 55.5) {
        return calcAQI(pm, 200, 151, 150.4, 55.5);
    } else if (pm > 35.5) {
        return calcAQI(pm, 150, 101, 55.4, 35.5);
    } else if (pm > 12.1) {
        return calcAQI(pm, 100, 51, 35.4, 12.1);
    } else if (pm >= 0) {
        return calcAQI(pm, 50, 0, 12, 0);
    }
}

/**
 *
 * @param {number} Cp
 * @param {number} Ih
 * @param {number} Il
 * @param {number} BPh
 * @param {number} BPl
 * @return {number}
 */
function calcAQI(Cp, Ih, Il, BPh, BPl) {
    [...arguments].forEach(arg=>requireNumber(arg));

    const a = (Ih - Il);
    const b = (BPh - BPl);
    const c = (Cp - BPl);
    return Math.round((a / b) * c + Il);
}

/**
 *
 * @param {number} aqi
 * @return {string[]|undefined}
 */
function getAQIDescription(aqi) {
    requireNumber(aqi, 0, 1000);
    if (aqi >= 401) {
        return ['Hazardous', '>401: Health alert: everyone may experience more serious health effects'];
    } else if (aqi >= 301) {
        return ['Hazardous', '301-400: Health alert: everyone may experience more serious health effects'];
    } else if (aqi >= 201) {
        return ['Very Unhealthy', '201-300: Health warnings of emergency conditions. The entire population is more likely to be affected'];
    } else if (aqi >= 151) {
        return ['Unhealthy', '151-200: Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects'];
    } else if (aqi >= 101) {
        return ['Unhealthy for Sensitive Groups', '101-150: Members of sensitive groups may experience health effects. The general public is not likely to be affected'];
    } else if (aqi >= 51) {
        return ['Moderate', '51-100: Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution'];
    } else if (aqi >= 0) {
        return ['Good', '0-50: Air quality is considered satisfactory, and air pollution poses little or no risk'];
    }
    throw Error(`Something went wrong, aqi='${aqi}'`);
}
