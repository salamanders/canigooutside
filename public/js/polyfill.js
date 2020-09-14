/*global console */
/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*jshint -W097 */
/*exported getPosition, normalizeJson, sleep */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 *
 * @return {Promise<GeolocationPosition>}
 */
const getPosition = async (modalId='position-permission') => {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, (positionError)=>{
            console.warn(`Issue getting position, trying modal.`, positionError);
            const permissionElt = document.getElementById(modalId);
            const permissionButton = permissionElt.getElementsByTagName('button')[0];
            permissionButton.onclick = () => {
                navigator.geolocation.getCurrentPosition(position => {
                    try {
                        resolve(position);
                        permissionElt.close();
                    } catch (e) {
                        console.warn(`Issue closing modal`, e);
                    }
                }, reject);
            };
            permissionElt.showModal();
        });
    });
};


/**
 * Data compressed into a json.fields/json.data[[]] array
 * @param {Object} json - un-normalized JSON
 * @param {string} fieldsKey
 * @param {string} dataKey
 * @return {Object}
 */
const normalizeJson =  (json, fieldsKey='fields', dataKey='data') => {
    const fields = json[fieldsKey];
    const data = json[dataKey];
    console.debug(`Fields: ${JSON.stringify(fields)}`);
    const reducer = (accumulator, currentValue, currentIndex) => {
        accumulator[fields[currentIndex]] = currentValue;
        return accumulator;
    };
    return data.map(row => row.reduce(reducer, {}));
};