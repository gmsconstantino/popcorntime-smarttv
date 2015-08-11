 define(['socketio', 'config', 'others/sprintf', 'others/cache'],
    function(io,config,sprintf, Cache) {

        var socket = io.connect("http://"+config.host);

        socket.on("cleanCache", function (argument) {
            alert('cleanCache');
        });
  
        function parseArgs (args) {
            msg = "";
            if (typeof args[0] === 'string') {
                msg = sprintf.sprintf(args[0], args.slice(1));
            } else if(typeof args[0] === 'object'){
                msg = sprintf.sprintf("%j", args[0]);
            } 
            return msg;
        }
        
        var Log = {
            debug : function(){
                var args = Array.prototype.slice.call(arguments);
                msg = parseArgs(args);
                console.debug(msg);
                socket.emit('debug', msg);
            },
            log : function(){
                obj = {};
                var args = Array.prototype.slice.call(arguments);
                if (typeof args[0] === 'string') {
                    msg = sprintf.sprintf(args[0], args.slice(1));
                    console.log(args);
                    obj.type = "string";
                } else if(typeof args[0] === 'object'){
                    msg = sprintf.sprintf("%j", args[0]);
                    console.log(args[0]);
                    obj.type = "object";
                }                
                obj.msg = msg;
                socket.emit('log', obj);
            },
            warn : function(){
                var args = Array.prototype.slice.call(arguments);
                msg = sprintf.sprintf(args[0], args.slice(1));
                console.warn(msg);
                socket.emit('warn', msg);
            },
            error : function(){
                var args = Array.prototype.slice.call(arguments);
                msg = sprintf.sprintf(args[0], args.slice(1));
                console.warn(msg);
                socket.emit('error', msg);
            },
            time : function(){
                var args = Array.prototype.slice.call(arguments);
                msg = sprintf.sprintf(args[0], args.slice(1));
                console.time(msg);
                socket.emit('time', msg);
            },
            timeEnd : function(){
                var args = Array.prototype.slice.call(arguments);
                msg = sprintf.sprintf(args[0], args.slice(1));
                console.timeEnd(msg);
                socket.emit('timeEnd', msg);
            }
        };

        return Log;
    }
);
