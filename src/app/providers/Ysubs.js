 define(['jquery', 'underscore', 'Q', 'others/Cache', 'others/language', 'config', 'others/logging'],
    function($, _, Q, Cache, Lang,  config, Log) {
    "use strict";

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

        jqueryOptions.crossDomain = options.crossDomain;

        if (options.crossDomain && $.support.cors) {
            jqueryOptions.url = 'http://' + config.host + '/proxy/' + jqueryOptions.url;
        }

        $.ajax(jqueryOptions)
            .done(function(data, status, xhr) {
                Log.debug("Request from YSubs (Ok): %s", jqueryOptions.url);
                callback(undefined, xhr, data);
            })
            .fail(function(xhr, status, err) {
                Log.error("%O", err);
                callback(err, xhr, undefined);
            });
    }

    var baseUrl = 'http://api.ysubs.com/subs/';
    var prefix = 'http://www.ysubs.com';
    var cacheNamespace = 'ysubs';

    var TTL = 1000 * 60 * 60 * 0.1; // 6 min

    var YSubs = {};

    YSubs.querySubtitles = function(imdbIds) {
        var url = baseUrl + _.map(imdbIds.sort(), function(id){return 'tt'+id;}).join('-');

        var deferred = Q.defer();

        if(imdbIds.length === 0) {
            deferred.resolve({subs:[]});
            return deferred.promise;
        }

        Log.debug('Requesting from YSubs: %s', url);
        Log.time('YSubs Request Took');
        request({url:url, json: true, crossDomain:true}, function(error, response, data){
            Log.timeEnd('YSubs Request Took');
            if(error) {
                deferred.reject(error);
            }
            if(data)
            if (!data.success) {
                deferred.reject(error);
            } else {
                deferred.resolve(data);
            }
        });

        return deferred.promise;
    };

    YSubs.formatForPopcorn = function(data) {
        var allSubs = {};

        // Iterate each movie
        _.each(data.subs, function(langs, imdbId) {
            var movieSubs = {};
            // Iterate each language
            _.each(langs, function(subs, lang) {
                // Pick highest rated
                var langCode = Lang.languageMapping[lang];
                movieSubs[langCode] = prefix + _.max(subs, function(s){return s.rating;}).url;
            });

            // Remove unsupported subtitles
            var filteredSubtitle = Lang.filterSubtitle(movieSubs);

            allSubs[imdbId.replace('tt','')] = filteredSubtitle;
        });

        return allSubs;
    };

    YSubs.fetch = function(imdbIds) {
        imdbIds = _.map(imdbIds, function(id){return id.toString();});
        var cachePromise = Cache.getItems(cacheNamespace, imdbIds);
        var ysubsPromise = cachePromise.then(function(cachedSubs){
                // Filter out cached subtitles
                var cachedIds = _.keys(cachedSubs);
                Log.log(cachedIds.length + ' cached subtitles');
                var filteredId = _.difference(imdbIds, cachedIds);
                return filteredId;
            })
            .then(YSubs.querySubtitles)
            .then(YSubs.formatForPopcorn);

        // Cache ysubs subtitles
        ysubsPromise.then(function(moviesSubs) {
                Log.log('Cache ' + _.keys(moviesSubs).length + ' subtitles');
                _.each(moviesSubs, function(movieSubs, imdbId) {
                    Cache.setItem(cacheNamespace, imdbId, movieSubs, TTL);
                });
            });

        // Wait for all query promise to finish
        return Q.allSettled([cachePromise, ysubsPromise])
            .then(function(results){
                // Merge all promise result
                var subs = {};
                _.each(results, function(result){
                    if(result.state === "fulfilled") {
                        _.extend(subs, result.value);
                    }
                });

                return subs;
            });
    };
    return YSubs;
});