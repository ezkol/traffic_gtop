/* global _,$,menus_obj,document,setInterval,location,setTimeout,console,alert,window,Backbone,BootstrapDialog,clearInterval */
var my_debug;
$( document ).ready(function() {
// When rending an underscore template, we want top-level
// variables to be referenced as part of an object. For
// technical reasons (scope-chain search), this speeds up
// rendering; however, more importantly, this also allows our
// templates to look / feel more like our server-side
// templates that use the rc (Request Context / Colletion) in
// order to render their markup.
	_.templateSettings.variable = "ctx";

	// Avoid `console` errors in browsers that lack a console.
	(function() {
		var method;
		var noop = function () {};
		var methods = [
			'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
			'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
			'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
			'timeStamp', 'trace', 'warn'
		];
		var length = methods.length;
		var console = (window.console = window.console || {});

		while (length--) {
			method = methods[length];

			// Only stub undefined methods.
			if (!console[method]) {
				console[method] = noop;
			}
		}
	}());

	// no support for IE < 9
	(function() {
		var div = document.createElement("div");
		div.innerHTML = "<!--[if lt IE 9]><i></i><![endif]-->";
		var isIeLessThan9 = (div.getElementsByTagName("i").length == 1);
		if (isIeLessThan9) {
			alert("This browser is not supported. Only IE 9+ , Chrome , FireFox , Safari and Opera Browsers are supported");
		}
	}());

	$.urlParam = function(name){
		var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
		if (results==null){
		   return null;
		}
		else{
		   return decodeURI(results[1]) || 0;
		}
	}

	Backbone.emulateHTTP = true; // set to true if server cannot handle HTTP PUT or HTTP DELETE
	Backbone.emulateJSON = true; // set to true if server cannot handle application/json requests
	
	function formatBytes(a,b)
	{
		if(0==a)
			return"0 Bytes";
		var c=/*1024 seems like traffic_top divides by 1000 ???*/1000,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));
		return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f];
	}

	function formatNumber(a,b)
	{
		if (a < 1)
		{
			return a.toFixed(2);
		}
		if(0==a)
			return"0";
		var c=1000,d=b||2,e=["","K","M","G","T","P","E","Z","Y"],f=Math.floor(Math.log(a)/Math.log(c));
		return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f];
	}
	function formatFixed(a,b)
	{
		var d=b||2;
		return a.toFixed(d);
	}

	////////////////////
	var AUTO_REFRESH_INTERVAL = 5000;
	
	var NUM_GRAPHS = 3;
	var NUM_LINES_IN_GRAPH = 6;
	
	var App = {
		Routers: {},
		Utils: {},
		Ajax: {},
		Objects: {},
		Charts : [],
		ChartsData : [] ,
		ChartsOptions : [],
		ModeAbsolute : false, 
	};


	App.Utils.Ajax = function () {
		this.count = 0;
		this.fail = 0;
		
		this.get = function(url,params,options) {
			//console.log("get init " + this.count + " " + this.showLoading);
			this.count++;
									
			var promise = $.get(url , null ,null, "json");
			promise.done(this.postDone.bind(this));
			promise.fail(this.postFail.bind(this));
			return promise; 
		};

		this.post = function(url,params,options) {
			//console.log("post init " + this.count + " " + this.showLoading);
			this.count++;
									
			var promise = $.post(url , params ,null, "xml");
			promise.done(this.postDone.bind(this));
			promise.fail(this.postFail.bind(this));
			return promise; 
		};
		this.postDone = function() {
			//console.log("post done " + this.count + " " + this.showLoading);
			//App.Objects.Vent.events.trigger("post" , "done");		
			
		};
		this.postFail = function() {
			console.log("post fail");
			this.fail++;			
		};
	};
			
	App.Utils.GoogleCharts = function() {
		var that = this;
		
		this.refresh_interval = AUTO_REFRESH_INTERVAL;
		this.running_idx = [0,0,0,0,0,0,0,0];
		
		this.display_rows = 50;
		
		//if (typeof($.urlParam('rows')) === 'undefined')
		if (isNaN(parseInt($.urlParam('rows'))) === true)
		{
		}
		else
		{
			this.display_rows = parseInt($.urlParam('rows'));
		}	
	
		this.template_table = _.template($("#template-table").html());

		//var table_html = $(this.template_table({}));

		for (var i = 0 ; i < 4; i++)
		{
			var num = i < 2 ? 15 : 11;
			$($("div[data-my-attr='table']")[i]).html(this.template_table({rows:num}));
		}
		$('label > input[type=checkbox]').on('change', function () {
		    console.log($(this).is(':checked'));
		    App.ModeAbsolute = $(this).is(':checked');
		});

		//$("div[data-my-attr='graph']").each(function(i) {
		//});

		this.ats_tooltip = [

"The percentage of cache lookups which were served successfully from the RAM Cache (thus avoiding slower I/O from the disk cache, or even slower network I/O to the origin server). This is calculated as a ratio from the two RAM Cache statistics for hits and  misses",

"The percentage of cache lookups which located a fresh cache object (i.e. an object not in need of any revalidation). These transactions are served directly from the cache to the client without any need to contact origin servers or spend time updating the cache. An effective Traffic Server cache will have a very high Fresh percentage, as these are the fastest responses to clients",

"The percentage of cache lookups which located a stale cache object, but for which the origin server did not return new data when Traffic Server revalidated the object. Revalidated objects don’t incur cache update performance hits, but they do still lead to (what ends up being unnecessary) network traffic with origin servers.A high percentage of revalidated cache lookups may indicate that Traffic Server is being too aggressive with its object staleness heuristics",

"The percentage of cache lookups which located an expired cache object. These were requests which located a matching object in the cache, but it had already been expired fully and a new copy was retrieved from the origin server. Unfortunately, the new copy from the origin server ended up being the unchanged from what had been marked expired in the cache.a high percentage of cold misses indicates that your origin servers are setting expirations on their responses which are too short, as compared to the actual lifetime of the content in those responses",

"The percentage of cache lookups which located an expired cache object and which resulted in new data being retrieved from the origin server",

"The percentage of requests for which the requested object was marked not cacheable by the origin server. A high percentage of uncacheable objects may indicate that either your origin servers simply contain a large amount of dynamic, uncacheable data, or that they are not properly setting cache control headers in their responses",

"The percentage of requests for which the client indicated that the cache should not be used (e.g. a Cache-Control: no-cache request header was present).A high percentage of these requests may indicate possible client-side abuse of your proxy, in which a disproportionate number of client connections are attempting to force their way past your Traffic Server cache",

"The average amount of time per lookup (in milliseconds) spent serving requests which were served by fresh cache lookups. Note that the underlying statistic is the total amount of time Traffic Server has spent serving these requests since startup, whereas traffic_top is displaying the number averaged by the total Fresh requests",

"The average amount of time per lookup (in milliseconds) spent serving requests which involved revalidating a stale object for which the origin server did not return new data. Note that the underlying statistic is the total amount of time Traffic Server has spent serving these requests since startup, whereas traffic_top is displaying the number averaged by the total Revalidate requests",

"The average amount of time per lookup (in milliseconds) spent serving requests which involved expired cache objects. Note that the underlying statistic is the total amount of time Traffic Server has spent serving these requests since startup, whereas traffic_top is displaying the number averaged by the total Cold requests",

"The average amount of time per lookup (in milliseconds) spent serving requests which were served by Traffic Server with new data obtained from an origin server. Note that the underlying statistic is the total amount of time Traffic Server has spent serving these requests since startup, whereas traffic_top is displaying the number averaged by the total Changed requests",

"The average amount of time per lookup (in milliseconds) spent serving requests which were served from the origin server because it had marked the object as uncacheable. Note that the underlying statistic is the total amount of time Traffic Server has spent serving these requests since startup, whereas traffic_top is displaying the number averaged by the total Not Cache requests",

"The average amount of time per lookup (in milliseconds) spent serving requests which were served by the origin server because the client had requested that the Traffic Server cache be bypassed. Note that the underlying statistic is the total amount of time Traffic Server has spent serving these requests since startup, whereas traffic_top is displaying the number averaged by the total No Cache requests",

"The number of HTTP connections currently open from Traffic Server to origin servers. Note that Traffic Server maintains a configurable number of origin server connections open at all times, whether there are requests being proxied or not, when configured as a reverse proxy to a known list of origin servers. This is not the case for forward proxy configurations, however, as Traffic Server has no foreknowledge of the servers to which clients may try to connect.",

"The number of currently-open HTTP connections from clients with Traffic Server.",

"The average number of requests made to origin servers by Traffic Server per connection. This field is simply the result of dividing the total number of requests made by the total number of connections that have ever been opened",

"The average number of requests made per client connection. When Keep-Alive support is enabled in Traffic Server and clients make use of it, they are able to submit multiple document requests over a single connection in some situations. This number is calculated from the total number of client requests divided by the total number of new connections that have been created",

"The number of currently active client connection threads (requests in the process of being fulfilled when the statistics snapshot was taken)",

"The average response time by Traffic Server across all client requests. Response time is measured from the moment a client connection is established, until the moment the last byte of the response is delivered. This field is simply the result of dividing the total time spent by Traffic Server servicing client requests by the total number of those requests",

"Total number of client requests serviced by Traffic Server. This includes both successful content-bearing responses as well as errors, redirects, and not-modified IMS responses. Additionally, this number includes requests which were serviced from the Traffic Server cache as well as through proxied origin connections",

"The total number of new HTTP connections from clients which have been created over the lifetime of the Traffic Server process",

"Statistics: proxy.process.net.dynamic_keep_alive_timeout_in_total, proxy.process.net.dynamic_keep_alive_timeout_in_count",

"The total bytes consumed by outgoing server response headers from Traffic Server to clients",

"The total bytes consumed by outgoing document bodies in responses from Traffic Server to clients",

"The summed bits (not bytes) of all Traffic Server responses to clients, whether served from the Traffic Server or through a proxied connection to an origin server",

"The total number of requests made by Traffic Server to origin servers, because client requests could not be fulfilled by the Traffic Server cache (for any reason, whether it was not present in the cache, was stale or expired, or not cacheable)",

"The total number of new HTTP connections from Traffic Server to origin servers that have been created during the lifetime of the Traffic Server process",

"The total bytes delivered as headers in responses from origin servers to Traffic Server",

"The total bytes delivered as document bodies in responses from origin servers to Traffic Server",

"The total bits (not bytes) transferred from origin servers to Traffic Server for proxied requests not fulfilled by the Traffic Server cache",

"The amount of disk space currently in use by the Traffic Server cache. This number will never exceed Disk Total",

"Total disk space allocated for Traffic Server cache",

"Current amount of RAM Cache occupied by objects. Objects located and served from the Traffic Server RAM Cache avoid the much slower disk I/O necessary to serve from spinning rust",

"Total space allocated for used by the Traffic Server RAM Cache",

"Total cache object lookups performed, including disk and RAM caches",

"Total number of object writes to the Traffic Server cache",

"Total number of existing cache objects which have been updated with new content from the origin server (i.e. existing cache object was stale, so Traffic Server revalidated against the origin and received a new object).",

"Total number of Traffic Server cache objects which have been deleted (generally through a PURGE request).",

"Current number of active cache reads",

"Current number of active cache writes",

"Current number of active cache updates",

"The current number of cache directory entries in use",

"The average size of current in the cache directory. This is calculated by dividing Entries into Disk Used",

"Total number of DNS lookups performed by Traffic Server, regardless of whether they were full DNS queries or were satisfied by entries in the HostDB cache. If you are not operating a forward proxy and if none of your origin servers are mapped by hostnames, then it is normal for your HostDB cache to be empty.",

"Total number of DNS lookups which were successfully served from the HostDB cache",

"The percentage of DNS lookups which were served from the HostDB cache, rather than requiring full DNS queries",

"The total number of entries in the HostDB lookup cache. If you are not operating a forward proxy and if none of your origin servers are mapped by hostnames, then it is normal for your HostDB cache to be empty",

"Average size in bytes of combined headers and document bodies for Traffic Server responses to clients",

"The average size of the combined header and document body responses from origin servers to Traffic Server",

"Represents the ratio of bytes served to user agents which were satisfied by cache hits, over the previous 10 seconds",

	];

		this.ats_stats = [
			["Ram-Hit"   ,4,[0,1,0,0] ,0,"proxy.process.cache.ram_cache.hits","proxy.process.cache.ram_cache.hits","proxy.process.cache.ram_cache.misses"],	
			["Fresh"     ,5,[0,1,1,0] ,1,"proxy.process.http.transaction_counts.hit_fresh"],
			["Revalidate",5,[0,1,2,0] ,2,"proxy.process.http.transaction_counts.hit_revalidated"],
			["Cold"      ,5,[0,1,3,0] ,3,"proxy.process.http.transaction_counts.miss_cold"],
			["Changed"   ,5,[0,1,4,0] ,4,"proxy.process.http.transaction_counts.miss_changed"],
			["Not-Cached",5,[0,1,5,0] ,5,"proxy.process.http.transaction_counts.miss_not_cacheable"],
			["No-Cache"  ,5,[-1,1,6,0],6,"proxy.process.http.transaction_counts.miss_client_no_cache"],

			["Fresh(ms)" ,8,[1,1,7,0]  ,7,"proxy.process.http.transaction_totaltime.hit_fresh", "proxy.process.http.transaction_counts.hit_fresh"],
			["Reval(ms)" ,8,[1,1,8,0]  ,8,"proxy.process.http.transaction_totaltime.hit_revalidated", "proxy.process.http.transaction_counts.hit_revalidated"],
			["Cold(ms)"  ,8,[1,1,9,0]  ,9,"proxy.process.http.transaction_totaltime.miss_cold", "proxy.process.http.transaction_counts.miss_cold"],
			["Change(ms)",8,[1,1,10,0],10,"proxy.process.http.transaction_totaltime.miss_changed", "proxy.process.http.transaction_counts.miss_changed"],
			["Not(ms)"   ,8,[1,1,11,0],11,"proxy.process.http.transaction_totaltime.miss_not_cacheable","proxy.process.http.transaction_counts.miss_not_cacheable"],
			["No(ms)"    ,8,[1,1,12,0],12,"proxy.process.http.transaction_totaltime.miss_client_no_cache", "proxy.process.http.transaction_counts.miss_client_no_cache"],

			["Origin Curr Conn"  ,1,[2,3,3,1],13,"proxy.process.http.current_server_connections"],
			["Client Curr Conn"  ,1,[2,2,3,1],14,"proxy.process.http.current_client_connections"],
			["Origin Req/Conn"   ,3,[2,3,1,1],15,"proxy.process.http.outgoing_requests","proxy.process.http.total_server_connections"],
			["Client Req/Conn"   ,3,[2,2,1,1],16,"proxy.process.http.incoming_requests","proxy.process.http.total_client_connections"],
			["Client Active Conn",1,[2,2,4,1],17,"proxy.process.http.current_active_client_connections"],
		  	["Client Resp (ms)"  ,9,[2,2,10,1],18,"proxy.process.http.total_transactions_time","proxy.process.http.incoming_requests"],

			// no grpah
			["Client Requests"   ,2,[-1,2,0,1],19,"proxy.process.http.incoming_requests"],
			["Client New Conn"   ,2,[-1,2,2,1],20,"proxy.process.http.total_client_connections"],
			["Client Dynamic KA" ,3,[-1,2,5,1],21,"proxy.process.net.dynamic_keep_alive_timeout_in_total","proxy.process.net.dynamic_keep_alive_timeout_in_count"],

			["Client Head Bytes" ,2,[-1,2,6,2],22,"proxy.process.http.user_agent_response_header_total_size"],
			["Client Body Bytes" ,2,[-1,2,7,2],23,"proxy.process.http.user_agent_response_document_total_size"],
			["Client Net (bits)" ,7,[-1,2,9,2],24,"proxy.process.http.user_agent_response_header_total_size", "proxy.process.http.user_agent_response_document_total_size"],

			["Origin Requests"   ,2,[-1,3,0,1],25,"proxy.process.http.outgoing_requests"],
			["Origin New Conn"   ,2,[-1,3,2,1],26,"proxy.process.http.total_server_connections"],
			["Origin Head Bytes" ,2,[-1,3,4,2],27,"proxy.process.http.origin_server_response_header_total_size"],
			["Origin Body Bytes" ,2,[-1,3,5,2],28,"proxy.process.http.origin_server_response_document_total_size"],
			["Origin Net (bits)" ,7,[-1,3,7,2],29,"proxy.process.http.origin_server_response_header_total_size","proxy.process.http.origin_server_response_document_total_size"],

			["Disk Used" 	,1,[-1,0,0,2],30,"proxy.process.cache.bytes_used"],
			["Disk Total"	,1,[-1,0,1,2],31,"proxy.process.cache.bytes_total"],
			["Ram Used"  	,1,[-1,0,2,2],32,"proxy.process.cache.ram_cache.bytes_used"],
			["Ram Total" 	,1,[-1,0,3,2],33,"proxy.process.cache.ram_cache.total_bytes"],
			["Lookups"   	,2,[-1,0,4,1],34,"proxy.process.http.cache_lookups"],
			["Writes"    	,2,[-1,0,5,1],35,"proxy.process.http.cache_writes"],
			["Updates"   	,2,[-1,0,6,1],36,"proxy.process.http.cache_updates"],
			["Deletes"   	,2,[-1,0,7,1],37,"proxy.process.http.cache_deletes"],
			["Read Active"	,1,[-1,0,8,1],38,"proxy.process.cache.read.active"],
			["Writes Active",1,[-1,0,9,1],39,"proxy.process.cache.write.active"],
			["Update Active",1,[-1,0,10,1],40,"proxy.process.cache.update.active"],
			["Entries"	,1,[-1,0,11,1],41,"proxy.process.cache.direntries.used"],
			["Avg Size"	,3,[-1,0,12,2],42,"proxy.process.cache.bytes_used","proxy.process.cache.direntries.used"],

			["DNS Lookups"  ,2,[-1,0,13,1],43,"proxy.process.hostdb.total_lookups"], 
			["DNS Hits"     ,2,[-1,0,14,1],44,"proxy.process.hostdb.total_hits"],

			["DNS Hit"	,4,[-1,1,13,0],45,"proxy.process.hostdb.total_hits","proxy.process.hostdb.total_lookups",1],
			["DNS Entry"	,1,[-1,1,14,2],46,"proxy.process.hostdb.total_entries"],

			["Client Avg Size",0,[-1,2,8,2],47,  "proxy.process.http.user_agent_response_header_total_size","proxy.process.http.user_agent_response_document_total_size","proxy.process.http.incoming_requests"],

			["Origin Avg Size",0,[-1,3,6,2],48, "proxy.process.http.origin_server_response_header_total_size","proxy.process.http.origin_server_response_document_total_size", "proxy.process.http.outgoing_requests"],

			// The difference of proxy.node.user_agent_total_bytes_avg_10s and proxy.node.origin_server_total_bytes_avg_10s, divided by proxy.node.user_agent_total_bytes_avg_10s.
			["BW hit ratio 10 sec",10,[-1,3,8,0],49,"proxy.node.user_agent_total_bytes_avg_10s","proxy.node.origin_server_total_bytes_avg_10s","proxy.node.user_agent_total_bytes_avg_10s"]	
		];
		
		for (var i = 0; i < this.ats_stats.length; i++)
		{
			var name = this.ats_stats[i][0];
			var tooltip_idx = this.ats_stats[i][3];
			var tooltip = this.ats_tooltip[tooltip_idx];
			var tbl  = this.ats_stats[i][2][1];
			var row  = that.ats_stats[i][2][2];
			$($("div[data-my-attr='table'] table tbody")[tbl]).find('tr').eq(row).find('td').eq(0).html(name);
			$($("div[data-my-attr='table'] table tbody")[tbl]).find('tr').eq(row).find('td').eq(0).attr('title',tooltip);	
		}
		

		this.prev_stats = {};
		this.prev_time = {};
		this.now_time = {};

		this.getValue = function(statistics,prev_statistics,name,type,idx) {

			var stats;
			if(statistics.hasOwnProperty('global')){
				stats = statistics.global;
			}
			else
			{
				stats = statistics.ats;
			}

			var prev_stats = {};
			if(!$.isEmptyObject(prev_statistics) && prev_statistics.hasOwnProperty('global')){
				prev_stats = prev_statistics.global;
			}
			else if (!$.isEmptyObject(prev_statistics))
			{
				prev_stats = prev_statistics.ats;
			}

			var stats_parsed = [	parseInt(stats[that.ats_stats[idx][4]]) ,
						parseInt(stats[that.ats_stats[idx][5]]) , 
						parseInt(stats[that.ats_stats[idx][6]]) ,
						parseInt(stats["proxy.process.http.incoming_requests"])];

			if (!$.isEmptyObject(prev_stats))
			{
				var diff0 = parseInt(stats[that.ats_stats[idx][4]]) - parseInt(prev_stats[that.ats_stats[idx][4]]);
				var diff1 = parseInt(stats[that.ats_stats[idx][5]]) - parseInt(prev_stats[that.ats_stats[idx][5]]);
				var diff2 = parseInt(stats[that.ats_stats[idx][6]]) - parseInt(prev_stats[that.ats_stats[idx][6]]);
				var diff3 = parseInt(stats["proxy.process.http.incoming_requests"]) - parseInt(prev_stats["proxy.process.http.incoming_requests"]);
				stats_parsed[0] = diff0;
				stats_parsed[1] = diff1;
				stats_parsed[2] = diff2;
				stats_parsed[3] = diff3;
			}

			var nDiff = 1;
			if (that.prev_time instanceof Date)
			{
				nDiff = that.now_time.getTime() - that.prev_time.getTime();
				// Get diff in seconds
  				nDiff = Math.floor(nDiff / 1000);
				//nDiff = nDiff / 1000;
				//console.log("time diff " + nDiff);
			}

			if (!$.isEmptyObject(prev_stats) && (type === 1 || type === 2 || type === 7))
			{
				for (var i = 0; i < stats_parsed.length; i++)
				{
					//console.log("div " + stats_parsed[i] + " nDiff " +  nDiff);
					stats_parsed[i] = parseFloat(stats_parsed[i]) / nDiff; 
					//console.log("div after " + stats_parsed[i]);					
				}
			}

			var num = stats_parsed[0];
			var res = 0;			
			if (type === 1 || type === 2)
			{
				res = num;
				//console.log( name + " type 1 | 2 "+ " num " + num);
			}
			else if (type === 3 || type === 8)
			{
				var den =  stats_parsed[1];
				den = den === 0 ? 1 : den;
				var mul = type === 8 ? 1000 : 1;
				res =  mul * num / den;
				//console.log( name + " type 3 or 8 mul " + mul + " num " +  num + " den " + den + " res " + res);				
			}
			else if (type === 4)
			{
				var tmp = 0;
				if (typeof that.ats_stats[idx][6] === 'string' || that.ats_stats[idx][6] instanceof String)
				{
					tmp = stats_parsed[2];
				}
				else
				{
					tmp = that.ats_stats[idx][6];
				}
				var den = stats_parsed[1] + tmp;
				den = den === 0 ? 1 : den;
				res = 100 * num / den;
				//console.log( name + " type 4 num " +  num + " den " + den + " res " + res );				
			}
			else if (type === 5)
			{
				var den = stats_parsed[3];
				den = den === 0 ? 1 : den;
				res = 100 * num / den;
				//console.log( name + " type 5 num " +  num + " den " + den + " res " + res);
				
			}
			else if (type === 6 || type === 7)
			{
				var den = stats_parsed[1];
				res =  num + den;
				res *= type === 7 ? 8 : 1;
				//console.log( name + " type 6 or 7 mul " + mul + " num " +  num + " den " + den + " res " + res);
			}
			else if (type === 9)
			{
				var den = stats_parsed[1];
				den = den === 0 ? 1 : den;
				num = num / 10000000;							
				res = num / den;							
				//console.log( name + " type 9 "+ " num " + num + " den " + den + " res " + res);				
			}
			else if (type === 0)					
			{
				num += stats_parsed[1]; 
				var den = stats_parsed[2];
				res =  num / den;
				//console.log( name + " type 0 "+ " num " + num + " den " + den + " res " + res);				
			}
			else if (type === 10)					
			{
				var dif = stats_parsed[1];
				var den = stats_parsed[2];
				res =   100 * (num - dif) / den;
				//console.log( name + " type 0 "+ " num " + num + " den " + den + " res " + res);				
			}
			else
			{
				console.log("Error unknown type");
			}

			return res;
		};

		this.options = {  //title: 'ATS stats',
				  width: 700,
				  height: 200,
				  chartArea: {  width: "50%", height: "70%" }			
				};	

		this.init = function() {
			console.log("init App.Utils.GoogleCharts");

			// Load the Visualization API and the corechart package.
			google.charts.load('current', {'packages':['corechart']});
			//google.charts.load('current', {'packages':['annotationchart']});

			// Set a callback to run when the Google Visualization API is loaded.
			google.charts.setOnLoadCallback(this.drawChart);

		};
		
		this.refresh = function() {
			//var self = that;

			var posting = App.Objects.Ajax.get(/*$(location).attr('hostname') +*/ "/_stats" , 0 , 0);
			posting.done(function( statistics ) { 
				//var json = $.parseJSON(statistics);
				//console.log( statistics );

				var graph_idx = 0;
				
				var graphs = [[],[],[]];

				var now = new Date();
				that.now_time = now;

				$($(".panel-title")[0]).html(now);

				for (var i = 0; i < that.ats_stats.length; i++)
				{
					var name = that.ats_stats[i][0];
					var type = that.ats_stats[i][1];
					var graph_idx = that.ats_stats[i][2][0];
					var tbl  = that.ats_stats[i][2][1];
					var row  = that.ats_stats[i][2][2];	
					var format = that.ats_stats[i][2][3];
					var tooltip_idx = that.ats_stats[i][3];
					var tooltip = that.ats_tooltip[tooltip_idx];
					var res = that.getValue(statistics,that.prev_stats,name,type,i);

					if (graph_idx !== -1)
					{
						graphs[graph_idx].push(res);
					}

					res = format === 0 ? formatFixed(res) : format === 1 ? formatNumber(res) : formatBytes(res);

					//$($("div[data-my-attr='table'] table tbody")[tbl]).find('tr').eq(row).find('td').eq(0).html(name);
					//$($("div[data-my-attr='table'] table tbody")[tbl]).find('tr').eq(row).find('td').eq(0).attr('title',tooltip);	
					$($("div[data-my-attr='table'] table tbody")[tbl]).find('tr').eq(row).find('td').eq(1).html(res);

					

					//$($("div[data-my-attr='table']")[tbl])	
				}
				
				for (graph_idx = 0; graph_idx < NUM_GRAPHS; graph_idx++)				
				{
					//console.log("that.display_rows " + that.display_rows + " getNumberOfRows() " + App.ChartsData[graph_idx].getNumberOfRows());
					if (that.display_rows > 0 && (App.ChartsData[graph_idx].getNumberOfRows() > that.display_rows))
					{
						App.ChartsData[graph_idx].removeRow(0);
					}
				}

				for (graph_idx = 0; graph_idx < NUM_GRAPHS; graph_idx++)
				{
					App.ChartsData[graph_idx].addRows([
						[	//now,
							that.running_idx[graph_idx],
							graphs[graph_idx][0],							
							graphs[graph_idx][1],
							graphs[graph_idx][2],
							graphs[graph_idx][3],
							graphs[graph_idx][4],
							graphs[graph_idx][5],
						]
					]);	
					App.Charts[graph_idx].draw(App.ChartsData[graph_idx], that.options);								
				
					that.running_idx[graph_idx]++;
				}

				that.refresh_interval = AUTO_REFRESH_INTERVAL;
				
				// Deep copy
				if (App.ModeAbsolute === true)
				{
					that.prev_stats = {};
				}
				else
				{
					that.prev_stats = JSON.parse(JSON.stringify(statistics));
				}
				that.prev_time = now;

				//console.log(that.refresh_interval);
				setTimeout(that.refresh.bind(this), that.refresh_interval);
				
			});
			posting.fail(function( /*data*/ ) {
				console.log("post BrowseConfig fail - stop metrics collection");
			});
		};
		
		this.drawChart = function() {
			// Create the data table.
			var i;
			for (i = 0; i < NUM_GRAPHS; i++)
			{
				// tables			
				App.ChartsData[i] = new google.visualization.DataTable();
				App.ChartsData[i].addColumn('number', 'index');
				var j;
				for (j = 0; j < NUM_LINES_IN_GRAPH; j++)
				{
					App.ChartsData[i].addColumn('number', that.ats_stats[NUM_LINES_IN_GRAPH * i + j][0]);
				}


				App.Charts[i] = new google.visualization.LineChart($("div[data-my-attr='graph']")[i]);
				
				App.Charts[i].draw(App.ChartsData[i],that.options);
			}

			setTimeout(that.refresh.bind(this), 100/*that.refresh_interval*/);
		};		
		
	};
	
	App.Routers.Router = Backbone.Router.extend({
		routes: {
			
			'*actions': "defaultRoute"
		},

		defaultRoute: function () {
			var that = this;
			console.log("hello world");
			that.initApp();
			return;			
		},
		initApp : function() {
			console.log("defaultRoute");
			App.Objects.Ajax = new App.Utils.Ajax();
			App.Objects.GoogChart = new App.Utils.GoogleCharts();
			App.Objects.GoogChart.init();
		},
		defaultAction: function () {
			console.log("defaultAction");
		},		
	});
 
	/*var appRouter =*/
	new App.Routers.Router();
	Backbone.history.start();
	my_debug = App;
});
