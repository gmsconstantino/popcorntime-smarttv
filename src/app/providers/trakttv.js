define(['jquery', 'underscore', 'Q'],
	function($, _, Q) {
		// Tempoary wrapper around $.get for request
		function request (uri, options, callback) {
			if (typeof uri === 'undefined') throw new Error('undefined is not a valid uri or options object.');
			if ((typeof options === 'function') && !callback) callback = options;
			if (options && typeof options === 'object') {
				options.uri = uri;
			} else if (typeof uri === 'string') {
				options = {uri:uri};
			} else {
				options = uri;
			}

			var jqueryOptions = {
				url: options.uri || options.url
			};
			if(options.json)
				jqueryOptions.dataType = 'jsonp';
			if(options.headers)
				jqueryOptions.headers = options.headers;
			if(options.method)
				jqueryOptions.type = options.method;
			if(options.body)
				jqueryOptions.data = options.body.toString();
			if(options.timeout)
				jqueryOptions.timeout = options.timeout;

			if (options.crossDomain && $.support.cors) {
            	jqueryOptions.url = 'http://192.168.1.65:3000/proxy/' + jqueryOptions.url;
        	}

			$.ajax(jqueryOptions)
				.done(function(data, status, xhr) {
					callback(undefined, xhr, data);
				})
				.fail(function(xhr, status, err) {
					callback(err, xhr, undefined);
				});
		}

		var MOVIE_PATH = 'movie';

		var API_ENDPOINT = URI('https://api-v2launch.trakt.tv'),
        CLIENT_ID = 'c7e20abc718e46fc75399dd6688afca9ac83cd4519c9cb1fba862b37b8640e89',
        CLIENT_SECRET = '476cf15ed52542c2c8dc502821280aa5f61a012db57f1ed1f479aaf88ab385cb',
        REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

		function MovieCollection(imdbIDs) {
			this.ids = imdbIDs;
			return this;
		}

		MovieCollection.prototype.getSummaries = function(callback) {
			if(this.ids.length === 0) {
				callback([]);
				return;
			}

			data = [];
			ids = this.ids;

			this.ids.forEach(function (id){
				var uri = API_ENDPOINT.clone().segment(['movies', id]);
				uri = uri.toString() + '?extended=full,images';

		        console.debug('Requesting from Trakt.tv: %s', uri);
				console.time('Trakt.tv Request Took');
				request(uri, {json: true, crossDomain:true, 
					headers: {
	                'Content-Type': 'application/json',
	                'trakt-api-version': '2',
	                'trakt-api-key': CLIENT_ID
	            }}, function(err, res, body) {
					console.timeEnd('Trakt.tv Request Took');
					data.push(JSON.parse(res.responseText));

					if(data.length === ids.length)
						callback(data);
				});
			});
		};

		this.resizeImage = function(imageUrl, width) {
			var uri = window.URI(imageUrl),
				ext = uri.suffix(),
				file = uri.filename().split('.' + ext)[0];

			return uri.filename(file + '-' + width + '.' + ext).toString();
		};

		return {
			resizeImage: this.resizeImage,
			MovieCollection: MovieCollection
		};
	}
);