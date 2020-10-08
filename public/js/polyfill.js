/*global console */
/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*jshint -W097 */

/*exported getPosition, normalizeJson, sleep, requireNumber, blockUntilDOMReady */

/** Block on document being fully ready, makes it safe to run scripts any time. */
async function blockUntilDOMReady() {
    console.time('blockUntilDOMReady');
    return new Promise(resolve => {
        if (document.readyState === 'complete') {
            console.timeEnd('blockUntilDOMReady');
            resolve();
            return;
        }
        const onReady = () => {
            document.removeEventListener('DOMContentLoaded', onReady, true);
            window.removeEventListener('load', onReady, true);
            console.timeEnd('blockUntilDOMReady');
            resolve();
        };
        document.addEventListener('DOMContentLoaded', onReady, true);
        window.addEventListener('load', onReady, true);
    });
}


/**
 *
 * @param {null|number} val
 * @param {null|number=} min
 * @param {null|number=} max
 */
function requireNumber(val, min = null, max = null) {
    if (val === undefined || val === null || typeof val !== 'number' || isNaN(val)) {
        throw new RangeError('Invalid number: ' + val);
    }
    if (min !== null && val < min) {
        throw new RangeError(`Number out of range: ${val}<${min}`);
    }
    if (max !== null && val > max) {
        throw new RangeError(`Number out of range: ${val}>${max}`);
    }
}

/**
 *
 * @param {number} ms
 * @return {Promise<*>}
 */
function sleep(ms) {
    requireNumber(ms, 0);
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 *
 * @return {Promise<*>}
 */
const getPosition = async (modalId = 'position-permission') => {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, (positionError) => {
            console.warn(`Issue getting position, displaying modal.`, positionError);
            document.getElementById(modalId).showModal();
            // Never resolves or rejects, which is ok.
        });
    });
};


/**
 * Data compressed into a json.fields/json.data[[]] array
 * @param {Object} json - un-normalized JSON
 * @param {string=} fieldsKey
 * @param {string=} dataKey
 * @return {Object}
 */
const normalizeJson = (json, fieldsKey = 'fields', dataKey = 'data') => {
    const fields = json[fieldsKey];
    const data = json[dataKey];
    console.debug(`Fields: ${JSON.stringify(fields)}`);
    const reducer = (accumulator, currentValue, currentIndex) => {
        accumulator[fields[currentIndex]] = currentValue;
        return accumulator;
    };
    return data.map(row => row.reduce(reducer, {}));
};