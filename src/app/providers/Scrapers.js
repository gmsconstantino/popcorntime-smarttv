 define(['jquery', 'underscore', 'backbone', 'models/Movie', 'providers/Ysubs', 'others/Cache', 'providers/trakttv', 'async', 'others/logging'],
    function($, _, Backbone, Movie, Ysubs, Cache, trakt, async, Log) {

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

        $.ajax(jqueryOptions)
            .done(function(data, status, xhr) {
                Log.debug("Request from YTS (Ok): %s", jqueryOptions.url);
                callback(undefined, xhr, data);
            })
            .fail(function(xhr, status, err) {
                Log.error("%O", err);
                callback(err, xhr, undefined);
            });
    }
    function getStars(p_rating){
        var stars = {
            full:0,
            half:false,
            empty:0
        };
        p_rating = Math.round(p_rating) / 2; // Roundoff number to nearest 0.5 %>

        for (var i = 1; i <= Math.floor(p_rating); i++) {
          stars.full ++;
        }

        stars.empty = 5 - stars.full;

        if (p_rating % 1 > 0) {
          stars.half = true;
          stars.empty --;
        }

        return stars;
    }

    // Hack to keep to cancel the request in case of new request
    var currentRequest = null;
    var Yts = Backbone.Collection.extend({
        apiUrl:"https://yts.to/api/v2/list_movies.json?sort=seeds&limit=30",
        model: Movie,
        movies: [],

        initialize: function(options) {
            this.createUrl(options);
        },

        createUrl:function(options){
            if(!options) return;
            if (options.keywords) {
                this.apiUrl += '&keywords=' + options.keywords;
            }

            if (options.genre) {
                if (options.genre == 'date') {
                  this.apiUrl += '&genre=all&sort=date';
                } else {
                  this.apiUrl += '&genre=' + options.genre;
                }
            }

            if (options.page) {
                this.apiUrl += '&set=' + options.page;
            }

            this.options = options;
            Yts.__super__.initialize.apply(this, arguments);
        },

        addMovie: function(model) {
            Log.log(this.movies);
            var stored = _.find(this.movies, function(movie) { return (movie.imdb_code == model.imdb); });
            Log.log(stored);
            // Create it on memory map if it doesn't exist.
            if (typeof stored === 'undefined') {
                stored = model;
            }

            if (stored.quality !== model.quality && model.quality === '720p') {
                stored.torrent = model.torrent;
                stored.quality = '720p';
            }

            // Set it's correspondent quality torrent URL.
            stored.torrents[model.quality] = model.torrent;

            // Push it if not currently on array.
            if (this.movies.indexOf(stored) === -1) {
                this.movies.push(stored);
            }
        },

        fetch: function(options) {
            this.createUrl(options);

            var collection = this;
            collection.trigger('loading');

            this.movies = [];

            if(currentRequest) {
                currentRequest.abort();
            }

            Log.debug('Requesting from YTS: %s', this.apiUrl);
            Log.time('YTS Request Took');
            var thisRequest = request(this.apiUrl, {json: true}, function(err, res, ytsData) {
                Log.timeEnd('YTS Request Took');
                var i = 0;

                if(status === 'error') {
                    collection.trigger('error');
                    return;
                }

                ytsData.MovieList = ytsData.data.movies;

                if (ytsData.error || typeof ytsData.MovieList === 'undefined') {
                    collection.set(collection.movies);
                    collection.trigger('loaded');
                    return;
                }

                var imdbIds = _.unique(_.pluck(ytsData.MovieList, 'imdb_code'));

                Ysubs.fetch(_.map(imdbIds, function(id){return id.replace('tt','');}))
                .then(function(subtitles) {
                    Log.log("Cache size: %j", Object.keys(subtitles).length);
                    
                    async.filterSeries(
                      imdbIds,
                      function(cd, cb) { 
                        Cache.getItem('trakttv', cd, function(d) { cb(d === null); }); 
                      },
                      function(imdbCodes) {

                        var traktMovieCollection = new trakt.MovieCollection(imdbCodes);

                        traktMovieCollection.getSummaries().then(function(trakData) {
                            Log.log('getSummaries callback');
                            // Check if new request was started
                            if(thisRequest !== currentRequest) return;

                            i = ytsData.MovieList.length;
                            ytsData.MovieList.forEach(function (movie) {
                                // No imdb, no movie.
                                if( typeof movie.imdb_code != 'string' || movie.imdb_code.replace('tt', '') === '' ){ return; }

                                Log.log('Create movie data '+movie.imdb_code); 

                                var traktInfo = _.find(trakData, function(trakMovie) { return trakMovie.ids.imdb == movie.imdb_code; });

                                var torrents = {};
                                movie.torrents.forEach(function(torrent){
                                    torrents[torrent.quality] = torrent.url;
                                });

                                var imdbId = movie.imdb_code.replace('tt', '');
                                var voteAverage = movie.rating ? parseFloat(movie.rating).toFixed(1) : 0.0;
                                // Temporary object
                                var movieModel = {
                                    imdb:       imdbId,
                                    title:      movie.title,
                                    year:       movie.year,
                                    runtime:    0,
                                    synopsis:   movie.overview,
                                    voteAverage: voteAverage,
                                    stars:      getStars(voteAverage),
                                    is720p:     (torrents['720p'] !== undefined),
                                    is1080p:    (torrents['1080p'] !== undefined),
                                    hasSDAndHD: (torrents['720p'] !== undefined && torrents['1080p'] !== undefined),

                                    image:      movie.small_cover_image,
                                    bigImage:   movie.medium_cover_image,
                                    backdrop:   '',

                                    quality:    movie.Quality,
                                    torrent:    movie.TorrentUrl,
                                    torrents:   torrents,
                                    videos:     {},
                                    subtitles:  subtitles[imdbId],
                                    seeders:    movie.TorrentSeeds,
                                    leechers:   movie.TorrentPeers,

                                    // YTS do not provide metadata and subtitle
                                    hasSubtitle:true
                                };

                                if(traktInfo) {
                                    movieModel.image = traktInfo.images.poster.thumb;
                                    movieModel.bigImage = traktInfo.images.poster.full;
                                    movieModel.backdrop = traktInfo.images.fanart.full;
                                    movieModel.synopsis = traktInfo.overview;
                                    movieModel.runtime = +traktInfo.runtime;
                                    Cache.setItem('trakttv', traktInfo.ids.imdb, traktInfo);
                                    Log.debug('Trakt.tv Cache Miss %O', traktInfo);
                                    collection.addMovie(movieModel);
                                    if(--i === 0) {
                                        collection.set(collection.movies);
                                        collection.trigger('loaded');
                                    }
                                } else {
                                    Cache.getItem('trakttv', movie.imdb_code, function(traktInfo) {
                                        if(traktInfo) {
                                            movieModel.image = traktInfo.images.poster.thumb;
                                            movieModel.bigImage = traktInfo.images.poster.full;
                                            movieModel.backdrop = traktInfo.images.fanart.full;
                                            movieModel.synopsis = traktInfo.overview;
                                            movieModel.runtime = +traktInfo.runtime;
                                        }
                                        Log.debug('Trakt.tv Cache Hit %O', traktInfo);
                                        collection.addMovie(movieModel);
                                        if(--i === 0) {
                                            collection.set(collection.movies);
                                            collection.trigger('loaded');
                                            Log.log("Collection Movies trigger loaded");
                                        }
                                    });
                                }
                            });
                        });
                    });
                });
            });
            currentRequest = thisRequest;
        }
    });

    return Yts;
});