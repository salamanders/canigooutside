import logging
from flask import Flask
import requests

app = Flask(__name__)

"""
@app.route('/cache.data')
def cache():
     """
"""Download the latest purpleair JSON """
"""
    url = 'https://www.purpleair.com/data.json'
    response = requests.get(url, timeout=30.0)
    response.raise_for_status()
    # /tmp
    return response.json()
 """

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=True)

