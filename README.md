# Can I go outside?

    python -m SimpleHTTPServer
    
    pip3 install flask
    python3 main.py
     
    gcloud config set project canigooutside
    gcloud app deploy --quiet
    
# TODO

 - [x] Copy the full JSON to this server weekly (how fast do new sensors get added?)
 - [x] Better permission popup  
 - [ ] Interpolate should use more sensors (all sensors?) then only call the API for the needed sensors.
 - [ ] Don't break when interpolate breaks    

## Feature Requests
 - [ ] Set your own threshold
 - [ ] More swearwords