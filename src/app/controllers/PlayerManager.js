define(['App', 'jquery', 'backbone'],
    function (App, $, Backbone) {
        function PlayerManager(){}

        PlayerManager.prototype.init = function(file, subtitles, callback, progressCallback){
            //console.log(file, subtitles, callback, progressCallback);
            $.ajax({
                //PC server ip
                url: 'http://' + config.host + '/?torrent='+file,
                dataType:'text',
                type:'GET',
                success:function( data ) {
                    callback(data);
                }
            });
        };

        PlayerManager.prototype.play = function(url, subs){
            var player = document.getElementById('video_player');
            player.src = url;
        };

    return PlayerManager;
});