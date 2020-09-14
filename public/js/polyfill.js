/*global console */
/*jshint esversion: 8 */
/*jshint unused:true */
/*jshint strict:implied */
/*jshint -W097 */
/*exported getPosition */


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