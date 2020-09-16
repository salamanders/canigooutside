import datetime, time, logging, requests
from flask import Flask
from pathlib import Path

logging.getLogger().setLevel(logging.INFO)

app = Flask(__name__)

tmp_file_path = '/tmp/cache.data.json'
remote_url = 'https://www.purpleair.com/data.json'

@app.route('/purpleair_cache.data.json')
def cache():
    """Serve up a PurpleAir JSON that is less than 60 minutes old"""
    min_timestamp = int(time.mktime((datetime.datetime.now() - datetime.timedelta(minutes=60)).timetuple()))
    cache_file = Path(tmp_file_path)

    if ((not cache_file.is_file()) or (cache_file.stat().st_mtime < min_timestamp)):
        logging.info("Refreshing cached file.")
        try:
            response = requests.get(remote_url, timeout=30.0)
            if(response.status_code != requests.codes.ok):
                logging.error("Failed to refresh cache:{}".format(response.status_code))
                raise Exception

            # Prove that it can be parsed, but then write the original text
            throwaway = response.json()
            cache_file.write_text(response.text)
            logging.debug('Refreshed cache file OK.')
            # TODO: Shrink file by stripping extras
        except Exception as e:
            logging.error("Error refreshing cache.")
            logging.exception(e)
    else:
        logging.info('Reusing existing fresh-enough cache.')

    # New cache, old cache after failure, or at worst, throw an error.
    response = app.response_class(
        response=cache_file.read_text(),
        status=200,
        mimetype='application/json'
    )
    return response


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=True)
