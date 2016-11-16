module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: ';',
        banner: '/*!\n' +
                ' * cdtable v<%= pkg.version %>\n' +
                ' * <%= pkg.description %>\n' +
                ' * Copyright 2016-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
                ' * Licensed under the MIT license\n' +
                ' */\n',
      },

      dist: {
        src: ['src/cdtable.js', 'src/template.js' , 'src/tools/*.js', 'src/addons/*.js'],
        dest: 'dist/<%= pkg.name %>.js'
      }

    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },

      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },

    watch: {
      files: ['<%= concat.dist.src %>'],
      tasks: ['concat', 'uglify']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('default', ['concat', 'uglify']);
};
