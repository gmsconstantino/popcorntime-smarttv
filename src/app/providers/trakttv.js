define(['jquery', 'underscore', 'Q', 'config', 'others/logging'],
	function($, _, Q, config, Log) {
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
				jqueryOptions.dataType = 'json';
			if(options.headers)
				jqueryOptions.headers = options.headers;
			if(options.method)
				jqueryOptions.type = options.method;
			if(options.body)
				jqueryOptions.data = options.body.toString();
			if(options.timeout)
				jqueryOptions.timeout = options.timeout;

			if (options.crossDomain && $.support.cors) {
            	jqueryOptions.url = 'http://' + config.host + '/proxy/' + jqueryOptions.url;
            	//jqueryOptions.jsonp = false;
        	}

			$.ajax(jqueryOptions)
				.done(function(data, status, xhr) {
					Log.debug("Request from Trakt (Ok): %s", jqueryOptions.url);
					callback(undefined, xhr, data);
				})
				.fail(function(xhr, status, err) {
					Log.error('Requesting from Trakt (Error): %s', jqueryOptions.url);
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
			
			var deferred = Q.defer();

			if(this.ids.length === 0) {
				deferred.resolve([]);
            	return deferred.promise;
			}

			data = [];
			ids = this.ids;

			this.ids.forEach(function (id){
				var uri = API_ENDPOINT.clone().segment(['movies', id]);
				uri = uri.toString() + '?extended=full,images';

		        Log.debug('Requesting from Trakt.tv: %s', uri);
				//Log.time('Trakt.tv Request Took');
				request(uri, {json: true, crossDomain:true, 
					headers: {
	                'trakt-api-version': '2',
	                'trakt-api-key': CLIENT_ID
	            }}, function(err, res, body) {
					//Log.timeEnd('Trakt.tv Request Took');
					data.push(JSON.parse(res.responseText));

					Log.log("Trakt callback Movie "+body.ids.imdb);

					if(err) {
		                deferred.reject(error);
			        }

					if(data.length === ids.length){
		                deferred.resolve(data);
					}
				});
			});

			return deferred.promise;
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