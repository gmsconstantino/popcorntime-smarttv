 define(['backbone','Q','jscache'],
    function(_, Q, jscache) {
        //var db = openDatabase('cachedb', '', 'Cache database', 50 * 1024 * 1024);
        var cache = new jscache(-1, false, new jscache.LocalStorageCacheStorage());

        var Cache = {    

            clear: function () {
                // clears all items from the cache
                cache.clear();
            },

            deleteItems: function(provider, keys) {
            },

            getItems: function (provider, keys) {
                var deferred = Q.defer();

                deferred.resolve({});
                return deferred.promise;
            },

            getItem: function (provider, key, cb) {
                if (typeof key !== 'string') {
                    key = JSON.stringify(key);
                }
                cb(JSON.parse(cache.getItem(key)));
            },
            setItem: function (provider, key, data, ttl) {
                if (typeof key !== 'string') {
                    key = JSON.stringify(key);
                }

                if (typeof data !== 'string') {
                    data = JSON.stringify(data);
                }

                cache.setItem(key, data, { expirationSliding: ttl });
            }
        };



        return Cache;
    }
);
