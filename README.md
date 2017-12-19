# traffic_gtop
HTML interface for ATS traffic_top utility. Tested on trafficserver-6.2.2
Only the main page , and only part of the stats are shown. 
The absolute stats seems OK , but some of the "non absolute" stats are still not correct.
For 7.x some changes might be required (proably the name of the stats page)

Note: I am not a WEB developer , so this is mostly cut & paste code. 
Any corrections / improvements / contributions are welcome.

To use it , you need to somehow serve the HTML/JS pages.
You can try to push and pin the 2 page in the ATS cache , or use a WEB server (or your origin). 

I used SimpleHTTPServer from pyton as follows:
1) create a new directory on you ATS machine and copy the ats_stats.html and ats_stats.js files to it
2) run: python -m SimpleHTTPServer 8000 &
3) add a remap rule to yout ATS remao.config file: map http://<your domain>/<optional path> http://127.0.0.1:8000
4) try accessing the page: http://<your domain>/<optional path>/ats_stats.html  
