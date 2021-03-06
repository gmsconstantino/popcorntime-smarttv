module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        samsung: {
            default_options:{
                options: {
                  samsungApp:'./dist/',
                  appId: '0.0.10'
                }
            }
        },
        requirejs: {
            dist: {
                options: {
                    baseUrl: "src/app",
                    optimize: "none",
                    preserveLicenseComments : false,
                    inlineText : true,
                    findNestedDependencies : true,
                    mainConfigFile: "src/app/config/require_config.js",
                    paths : {
                      requireLib : '../libs/require'
                    },
                    include: [
                        '../libs/URI.min.js',
                        'requireLib',
                        "AppInit"
                    ],
                    out: "./dist/optimized.min.js"
                }
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'src/app/**/*.js', '!src/libs/**/*.js', '!./**/*min.js'],
            options: {
                evil: false,
                regexdash: true,
                browser: true,
                wsh: true,
                trailing: true,
                sub: true,
                nonbsp:true,
                globals: {
                    jQuery: true,
                    console: false,
                    module: true,
                    document: true
                }
            }
        },
        watch: {
          scripts: {
            files: ['src/app/**/*.js','assets/**'],
            tasks: ['build'],
            options: {
              spawn: false
            }
          }
        },
        sync: {
          assets: {
            files: [{
              cwd: 'assets',
              src: [
                '**'
              ],
              dest: 'dist/assets',
            }],
              verbose: false
          },
          src: {
            files: [{
              cwd: 'src',
              src: [
                'index.html',
                'config.xml',
                'widget.info',
                'Main.js',
                'icon/*'
              ],
              dest: 'dist/',
            }],
              verbose: false
          },
        },
        express: {
          options: {
            // Override defaults here
          },
          dev: {
            options: {
              background:false,
              script: 'server_local.js'
            }
          },
      }
    });

    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-sync');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-samsungstv-packager');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.registerTask('server', ['build','express:dev']);
    grunt.registerTask('deploy', ['build','samsung']);
    grunt.registerTask('build', ['jshint', 'requirejs:dist', 'sync:assets', 'sync:src']);
    grunt.registerTask('default', ['build']);
};
