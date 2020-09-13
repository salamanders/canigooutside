# Can I go outside?

    python -m SimpleHTTPServer
    gcloud config set project canigooutside
    gcloud app deploy
    
    




button.addEventListener("click", function() {
  navigator.geolocation.getCurrentPosition(function(position) {
    let lat = position.coords.latitude;
    let long = position.coords.longitude;

    latText.innerText = lat.toFixed(2);
    longText.innerText = long.toFixed(2);
  });
});


https://www.purpleair.com/json
https://www.purpleair.com/json?show=<id>
 