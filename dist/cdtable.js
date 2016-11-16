/*!
 * cdtable v1.1.0
 * custom define table , require jq , jsmod for pc. this table pulings support pagination, filter function with server side datasource. cdtable also can provide people defines custom row to display.
 * Copyright 2016-2016 gaochao
 * Licensed under the MIT license
 */
(function () {
  // 定义几个基础的布局layout
  var TPL_CD_LAYOUT  = [
    '<div data-cd-container="plugin-top"></div>',
    '<div class="cdtable-table-container" data-cd-container="table"></div>',
    '<div data-cd-container="plugin-bottom"></div>'
  ]

  var TPL_CD_EMPTY = '<div class="cdtable-table-empty">没有数据，重新查询</div>';

  var STAT_LOADING = 'STATE_LOADING';
  var STAT_LOADED = 'STAT_LOADED';

  var CdTable = function (option, el) {
    var self = this;
    this.option = option;
    this.$el = $(el).addClass('cdtable-root-container');
    this._initEvent();
    this._firstGet = 1;
    this._bindHistory();
  }

  $.extend(CdTable.prototype, {
    /**
     * 获取history配置
     */
    getHistoryOpt: function () {
      if (this.option.history && this.option.history.key) {
        return this.option.history;
      }

      return false;
    },

    /**
     * 绑定 History
     */
    _bindHistory: function () {
      var self = this,
        history = self.option.history;

      // 初始化的 hash
      var hash =  History.getState().hash;
      if (hash) {
        historyOpt = cdtable.tools.url.getParamMap(hash);
        self.historyOpt = historyOpt;
      }

      History.Adapter.bind(window, 'statechange', function() {
        var State = History.getState();
        var historyOpt = cdtable.tools.url.getParamMap(State.hash);

        self.historyOpt = historyOpt;
        self._disptachHistory(historyOpt);
      });
    },

    getHistoryValue: function (key) {
      if (this.historyOpt) {
        return this.historyOpt[key];
      }
    },

    setHistory: function (key, value) {
      var self = this;

      self.historyOpt = self.historyOpt || {};

      // 和以前的一样不需要改变
      if (self.historyOpt[key] == value) {
        return;
      }

      // 改变原始 hash
      self.historyOpt[key] = value;

      // 防止立即执行
      self._pushTimer && clearTimeout(self._pushTimer);

      self._pushTimer = setTimeout(function () {
        self._pushHistory();
      }, 5);
    },

    _pushHistory: function () {
      var self = this;

      var historyOpt = self.historyOpt;
      var param = $.param(historyOpt);

      var stateCurrent = History.getState();

      // debugger;

      console.log('push:' + param);

      History.pushState(null, null, '?' + param);
    },

    _disptachHistory: function (data) {
      this.$el.trigger('cdtable.hashchange', [data]);
    },

    /**
     * 监听事件
     */
    _initEvent: function () {
      var self = this;

      self.$el.on('cdtable.reflow', function () {
        self.getTable();
      });
    },

    /**
     * 初始化表格，以及 addons 的 view
     */
    _initView: function () {
      this.$el.html(TPL_CD_LAYOUT);
      this.$topPluginContainer = this.$el.find('[data-cd-container=plugin-top]');
      this.$bottomPluginContainer = this.$el.find('[data-cd-container=plugin-bottom]');
      this.$tableContainer = this.$el.find('[data-cd-container=table]');

      // 初始化
      $.each(this.addons, function () {
        this.initView();
      });
    },

    /**
     * 由 load 事件触发
     * 1. 获取基本数据、以及各个插件的数据
     * 2. 通过 getUrl 获取请求地址
     * 3. 获取 json 数据，并进行渲染
     */
    getTable: function () {
      var self = this;

      // 如果正在请求暂停上一次的数据获取
      if (self._isLoading()) {
        self.ajaxInstance.abort();
      }

      // 拼装插件配置
      var urlData = {};
      $.each(this.addons, function (key) {
        // 两种不用改变 hash 的情况
        // 其实都是对初始状态进行判断
        urlData[key] = this.getAddonData();
      });

      var url = self.option.getUrl(urlData);

      if (self._validateUrl(url)) {
        self.ajaxInstance = self.option.getAjaxData ? self.option.getAjaxData(url)
          : self._getAjaxData(url);

        self._startLoading();

        // 成功回调处理
        self.ajaxInstance.done(function (json) {
          var rowData = self.option.getRowsData(json);

          self._endLoading(json);
          self._firstGet = false;

          if (rowData && rowData.length) {
            self._render(rowData, json);
          } else {
            self._renderEmpty();
          }
        });
      }
    },

    /**
     * 渲染数据为空的情况
     */
    _renderEmpty: function () {
      this.$tableContainer.html(this.option.empty ? this.option.empty() : TPL_CD_EMPTY);
    },

    /**
     * 返回 ajax 对象，可以被 option 中的 getAjaxData 所替换，依照用户设置加入各种其他 ajax 参数
     */
    _getAjaxData: function (url) {
      return $.ajax({
        url: url
      });
    },

    /**
     * 判断是否正在获取数据
     */
    _isLoading: function () {
      return this.__load_state == STAT_LOADING;
    },

    /**
     * 开始获取数据
     */
    _startLoading: function () {
      this.__load_state = STAT_LOADING;
      this.$el.addClass('loading');
      this.$el.trigger('cdtable.startloading');
    },

    /**
     * 结束获取
     */
    _endLoading: function (json) {
      var e = $.Event('cdtable.endloading', {
        json: json
      });
      this.__load_state = STAT_LOADED;
      this.$el.removeClass('loading');
      this.$el.trigger(e);
    },

    /**
     * 表格主体的渲染函数
     */
    _render: function (rowData, json) {
      var self = this,
        html;

      var tbodyStr = '';

      rowData.forEach(function (data) {
        var str = self.option.rows(data);

        tbodyStr += str;
      });

      if (self.option.isUL) {
        html = ['<ul class=\"' + (self.option.ulClass || '') + '\">',
            tbodyStr,
        '</ul>'].join("");
      } else {
        html = ['<table class=\"' + (self.option.tableClass || '') + '\">',
          '<thead>',
            self.option.headerRow(rowData, json),
          '</thead>',
          '<tbody>',
            tbodyStr,
          '</tbody>',
        '</table>'].join("");
      }


      self.$tableContainer.html(html);
    },

    /**
     * 验证 url 的正确性
     */
    _validateUrl: function (url) {
      return true;
    },

    /**
     * 验证一个 addon 是否符合规则
     */
    _validateAddon: function (addon) {
      var f = true;

      ['_addonName', 'initView', 'setRoot'].forEach(function (item) {
        if (addon[item] === undefined) {
          f = false;
          return false;
        }
      });

      return f;
    },

    /**
     * 设置 table 组件的插件列表 , 设置完毕后会初始化各个 addon 的 ui
     * @param
     */
    setAddons: function (addonsList) {
      var self = this;

      self.addons = {};

      // 初始化各个 addons
      addonsList.forEach(function (addon) {
        if (self._validateAddon(addon)) {
          addon.setRoot(self);
          self.addons[addon.getName()] = addon
        }
      });

      self._initView();

      return self;
    },

  });


  /**
   * jQuery plugin cdtable
   * 注意以下几点:
   * headerRow 函数返回的 html 数据中 td 的个数，必须与 rows 函数 td 个数一致
   * @param {object}   option 插件配置参数
   * @param {function} option.headerRow 表头回调函数，返回表头 html
   * @param {function} option.rows 每行内容回调函数，返回没行的 html
   *
   * @param {function} option.getUrl 返回获取数据的 url
   * eg.
   * function (option) {
   *   var currentPage = option.pagination.current;
   *   var filterArr = option.filter.data;
   *
   *   return '/api/getList?page=' + currentPage + $.param(filterArr);
   * }
   *
   * @param {function} option.getRowsData 获取当前 ajax 请求的 rows 数据
   * eg.
   * function (json) {
   *   // 判断当前请求是否有数组数据，如果有则返回, 没有的话就返回 false
   *   if (json.data) {
   *     return json.data
   *   }
   *
   *   return false
   * }
   *
   *
   */
  $.fn.cdtable = function (option) {
    if (!option) {
      return this.data('cdtable');
    }

    return this.each(function () {
      var ins = new CdTable(option, $(this));

      $(this).data('cdtable', ins);
    });
  }

  window.cdtable = {};
  window.cdtable.addons = {};
  window.cdtable.tools = {};
})();
;// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(){
  var cache = {};
 
  template = function tmpl(str, data){
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      cache[str] = cache[str] ||
        tmpl(document.getElementById(str).innerHTML) :
     
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +
       
        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +
       
        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'")
      + "');}return p.join('');");
   
    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
  };

  window.cdtable.template = template;
})();;/**
 * History.js HTML4 Support
 * Depends on the HTML5 Support
 * @author Benjamin Arthur Lupton <contact@balupton.com>
 * @copyright 2010-2011 Benjamin Arthur Lupton <contact@balupton.com>
 * @license New BSD License <http://creativecommons.org/licenses/BSD/>
 */

(function(window,undefined){
	"use strict";

	// ========================================================================
	// Initialise

	// Localise Globals
	var
		document = window.document, // Make sure we are using the correct document
		setTimeout = window.setTimeout||setTimeout,
		clearTimeout = window.clearTimeout||clearTimeout,
		setInterval = window.setInterval||setInterval,
		History = window.History = window.History||{}; // Public History Object

	// Check Existence
	if ( typeof History.initHtml4 !== 'undefined' ) {
		throw new Error('History.js HTML4 Support has already been loaded...');
	}


	// ========================================================================
	// Initialise HTML4 Support

	// Initialise HTML4 Support
	History.initHtml4 = function(){
		// Initialise
		if ( typeof History.initHtml4.initialized !== 'undefined' ) {
			// Already Loaded
			return false;
		}
		else {
			History.initHtml4.initialized = true;
		}


		// ====================================================================
		// Properties

		/**
		 * History.enabled
		 * Is History enabled?
		 */
		History.enabled = true;


		// ====================================================================
		// Hash Storage

		/**
		 * History.savedHashes
		 * Store the hashes in an array
		 */
		History.savedHashes = [];

		/**
		 * History.isLastHash(newHash)
		 * Checks if the hash is the last hash
		 * @param {string} newHash
		 * @return {boolean} true
		 */
		History.isLastHash = function(newHash){
			// Prepare
			var oldHash = History.getHashByIndex(),
				isLast;

			// Check
			isLast = newHash === oldHash;

			// Return isLast
			return isLast;
		};

		/**
		 * History.isHashEqual(newHash, oldHash)
		 * Checks to see if two hashes are functionally equal
		 * @param {string} newHash
		 * @param {string} oldHash
		 * @return {boolean} true
		 */
		History.isHashEqual = function(newHash, oldHash){
			newHash = encodeURIComponent(newHash).replace(/%25/g, "%");
			oldHash = encodeURIComponent(oldHash).replace(/%25/g, "%");
			return newHash === oldHash;
		};

		/**
		 * History.saveHash(newHash)
		 * Push a Hash
		 * @param {string} newHash
		 * @return {boolean} true
		 */
		History.saveHash = function(newHash){
			// Check Hash
			if ( History.isLastHash(newHash) ) {
				return false;
			}

			// Push the Hash
			History.savedHashes.push(newHash);

			// Return true
			return true;
		};

		/**
		 * History.getHashByIndex()
		 * Gets a hash by the index
		 * @param {integer} index
		 * @return {string}
		 */
		History.getHashByIndex = function(index){
			// Prepare
			var hash = null;

			// Handle
			if ( typeof index === 'undefined' ) {
				// Get the last inserted
				hash = History.savedHashes[History.savedHashes.length-1];
			}
			else if ( index < 0 ) {
				// Get from the end
				hash = History.savedHashes[History.savedHashes.length+index];
			}
			else {
				// Get from the beginning
				hash = History.savedHashes[index];
			}

			// Return hash
			return hash;
		};


		// ====================================================================
		// Discarded States

		/**
		 * History.discardedHashes
		 * A hashed array of discarded hashes
		 */
		History.discardedHashes = {};

		/**
		 * History.discardedStates
		 * A hashed array of discarded states
		 */
		History.discardedStates = {};

		/**
		 * History.discardState(State)
		 * Discards the state by ignoring it through History
		 * @param {object} State
		 * @return {true}
		 */
		History.discardState = function(discardedState,forwardState,backState){
			//History.debug('History.discardState', arguments);
			// Prepare
			var discardedStateHash = History.getHashByState(discardedState),
				discardObject;

			// Create Discard Object
			discardObject = {
				'discardedState': discardedState,
				'backState': backState,
				'forwardState': forwardState
			};

			// Add to DiscardedStates
			History.discardedStates[discardedStateHash] = discardObject;

			// Return true
			return true;
		};

		/**
		 * History.discardHash(hash)
		 * Discards the hash by ignoring it through History
		 * @param {string} hash
		 * @return {true}
		 */
		History.discardHash = function(discardedHash,forwardState,backState){
			//History.debug('History.discardState', arguments);
			// Create Discard Object
			var discardObject = {
				'discardedHash': discardedHash,
				'backState': backState,
				'forwardState': forwardState
			};

			// Add to discardedHash
			History.discardedHashes[discardedHash] = discardObject;

			// Return true
			return true;
		};

		/**
		 * History.discardedState(State)
		 * Checks to see if the state is discarded
		 * @param {object} State
		 * @return {bool}
		 */
		History.discardedState = function(State){
			// Prepare
			var StateHash = History.getHashByState(State),
				discarded;

			// Check
			discarded = History.discardedStates[StateHash]||false;

			// Return true
			return discarded;
		};

		/**
		 * History.discardedHash(hash)
		 * Checks to see if the state is discarded
		 * @param {string} State
		 * @return {bool}
		 */
		History.discardedHash = function(hash){
			// Check
			var discarded = History.discardedHashes[hash]||false;

			// Return true
			return discarded;
		};

		/**
		 * History.recycleState(State)
		 * Allows a discarded state to be used again
		 * @param {object} data
		 * @param {string} title
		 * @param {string} url
		 * @return {true}
		 */
		History.recycleState = function(State){
			//History.debug('History.recycleState', arguments);
			// Prepare
			var StateHash = History.getHashByState(State);

			// Remove from DiscardedStates
			if ( History.discardedState(State) ) {
				delete History.discardedStates[StateHash];
			}

			// Return true
			return true;
		};


		// ====================================================================
		// HTML4 HashChange Support

		if ( History.emulated.hashChange ) {
			/*
			 * We must emulate the HTML4 HashChange Support by manually checking for hash changes
			 */

			/**
			 * History.hashChangeInit()
			 * Init the HashChange Emulation
			 */
			History.hashChangeInit = function(){
				// Define our Checker Function
				History.checkerFunction = null;

				// Define some variables that will help in our checker function
				var lastDocumentHash = '',
					iframeId, iframe,
					lastIframeHash, checkerRunning,
					startedWithHash = Boolean(History.getHash());

				// Handle depending on the browser
				if ( History.isInternetExplorer() ) {
					// IE6 and IE7
					// We need to use an iframe to emulate the back and forward buttons

					// Create iFrame
					iframeId = 'historyjs-iframe';
					iframe = document.createElement('iframe');

					// Adjust iFarme
					// IE 6 requires iframe to have a src on HTTPS pages, otherwise it will throw a
					// "This page contains both secure and nonsecure items" warning.
					iframe.setAttribute('id', iframeId);
					iframe.setAttribute('src', '#');
					iframe.style.display = 'none';

					// Append iFrame
					document.body.appendChild(iframe);

					// Create initial history entry
					iframe.contentWindow.document.open();
					iframe.contentWindow.document.close();

					// Define some variables that will help in our checker function
					lastIframeHash = '';
					checkerRunning = false;

					// Define the checker function
					History.checkerFunction = function(){
						// Check Running
						if ( checkerRunning ) {
							return false;
						}

						// Update Running
						checkerRunning = true;

						// Fetch
						var
							documentHash = History.getHash(),
							iframeHash = History.getHash(iframe.contentWindow.document);

						// The Document Hash has changed (application caused)
						if ( documentHash !== lastDocumentHash ) {
							// Equalise
							lastDocumentHash = documentHash;

							// Create a history entry in the iframe
							if ( iframeHash !== documentHash ) {
								//History.debug('hashchange.checker: iframe hash change', 'documentHash (new):', documentHash, 'iframeHash (old):', iframeHash);

								// Equalise
								lastIframeHash = iframeHash = documentHash;

								// Create History Entry
								iframe.contentWindow.document.open();
								iframe.contentWindow.document.close();

								// Update the iframe's hash
								iframe.contentWindow.document.location.hash = History.escapeHash(documentHash);
							}

							// Trigger Hashchange Event
							History.Adapter.trigger(window,'hashchange');
						}

						// The iFrame Hash has changed (back button caused)
						else if ( iframeHash !== lastIframeHash ) {
							//History.debug('hashchange.checker: iframe hash out of sync', 'iframeHash (new):', iframeHash, 'documentHash (old):', documentHash);

							// Equalise
							lastIframeHash = iframeHash;

							// If there is no iframe hash that means we're at the original
							// iframe state.
							// And if there was a hash on the original request, the original
							// iframe state was replaced instantly, so skip this state and take
							// the user back to where they came from.
							if (startedWithHash && iframeHash === '') {
								History.back();
							}
							else {
								// Update the Hash
								History.setHash(iframeHash,false);
							}
						}

						// Reset Running
						checkerRunning = false;

						// Return true
						return true;
					};
				}
				else {
					// We are not IE
					// Firefox 1 or 2, Opera

					// Define the checker function
					History.checkerFunction = function(){
						// Prepare
						var documentHash = History.getHash()||'';

						// The Document Hash has changed (application caused)
						if ( documentHash !== lastDocumentHash ) {
							// Equalise
							lastDocumentHash = documentHash;

							// Trigger Hashchange Event
							History.Adapter.trigger(window,'hashchange');
						}

						// Return true
						return true;
					};
				}

				// Apply the checker function
				History.intervalList.push(setInterval(History.checkerFunction, History.options.hashChangeInterval));

				// Done
				return true;
			}; // History.hashChangeInit

			// Bind hashChangeInit
			History.Adapter.onDomLoad(History.hashChangeInit);

		} // History.emulated.hashChange


		// ====================================================================
		// HTML5 State Support

		// Non-Native pushState Implementation
		if ( History.emulated.pushState ) {
			/*
			 * We must emulate the HTML5 State Management by using HTML4 HashChange
			 */

			/**
			 * History.onHashChange(event)
			 * Trigger HTML5's window.onpopstate via HTML4 HashChange Support
			 */
			History.onHashChange = function(event){
				//History.debug('History.onHashChange', arguments);

				// Prepare
				var currentUrl = ((event && event.newURL) || History.getLocationHref()),
					currentHash = History.getHashByUrl(currentUrl),
					currentState = null,
					currentStateHash = null,
					currentStateHashExits = null,
					discardObject;

				// Check if we are the same state
				if ( History.isLastHash(currentHash) ) {
					// There has been no change (just the page's hash has finally propagated)
					//History.debug('History.onHashChange: no change');
					History.busy(false);
					return false;
				}

				// Reset the double check
				History.doubleCheckComplete();

				// Store our location for use in detecting back/forward direction
				History.saveHash(currentHash);

				// Expand Hash
				if ( currentHash && History.isTraditionalAnchor(currentHash) ) {
					//History.debug('History.onHashChange: traditional anchor', currentHash);
					// Traditional Anchor Hash
					History.Adapter.trigger(window,'anchorchange');
					History.busy(false);
					return false;
				}

				// Create State
				currentState = History.extractState(History.getFullUrl(currentHash||History.getLocationHref()),true);

				// Check if we are the same state
				if ( History.isLastSavedState(currentState) ) {
					//History.debug('History.onHashChange: no change');
					// There has been no change (just the page's hash has finally propagated)
					History.busy(false);
					return false;
				}

				// Create the state Hash
				currentStateHash = History.getHashByState(currentState);

				// Check if we are DiscardedState
				discardObject = History.discardedState(currentState);
				if ( discardObject ) {
					// Ignore this state as it has been discarded and go back to the state before it
					if ( History.getHashByIndex(-2) === History.getHashByState(discardObject.forwardState) ) {
						// We are going backwards
						//History.debug('History.onHashChange: go backwards');
						History.back(false);
					} else {
						// We are going forwards
						//History.debug('History.onHashChange: go forwards');
						History.forward(false);
					}
					return false;
				}

				// Push the new HTML5 State
				//History.debug('History.onHashChange: success hashchange');
				History.pushState(currentState.data,currentState.title,encodeURI(currentState.url),false);

				// End onHashChange closure
				return true;
			};
			History.Adapter.bind(window,'hashchange',History.onHashChange);

			/**
			 * History.pushState(data,title,url)
			 * Add a new State to the history object, become it, and trigger onpopstate
			 * We have to trigger for HTML4 compatibility
			 * @param {object} data
			 * @param {string} title
			 * @param {string} url
			 * @return {true}
			 */
			History.pushState = function(data,title,url,queue){
				//History.debug('History.pushState: called', arguments);

				// We assume that the URL passed in is URI-encoded, but this makes
				// sure that it's fully URI encoded; any '%'s that are encoded are
				// converted back into '%'s
				url = encodeURI(url).replace(/%25/g, "%");

				// Check the State
				if ( History.getHashByUrl(url) ) {
					throw new Error('History.js does not support states with fragment-identifiers (hashes/anchors).');
				}

				// Handle Queueing
				if ( queue !== false && History.busy() ) {
					// Wait + Push to Queue
					//History.debug('History.pushState: we must wait', arguments);
					History.pushQueue({
						scope: History,
						callback: History.pushState,
						args: arguments,
						queue: queue
					});
					return false;
				}

				// Make Busy
				History.busy(true);

				// Fetch the State Object
				var newState = History.createStateObject(data,title,url),
					newStateHash = History.getHashByState(newState),
					oldState = History.getState(false),
					oldStateHash = History.getHashByState(oldState),
					html4Hash = History.getHash(),
					wasExpected = History.expectedStateId == newState.id;

				// Store the newState
				History.storeState(newState);
				History.expectedStateId = newState.id;

				// Recycle the State
				History.recycleState(newState);

				// Force update of the title
				History.setTitle(newState);

				// Check if we are the same State
				if ( newStateHash === oldStateHash ) {
					//History.debug('History.pushState: no change', newStateHash);
					History.busy(false);
					return false;
				}

				// Update HTML5 State
				History.saveState(newState);

				// Fire HTML5 Event
				if(!wasExpected)
					History.Adapter.trigger(window,'statechange');

				// Update HTML4 Hash
				if ( !History.isHashEqual(newStateHash, html4Hash) && !History.isHashEqual(newStateHash, History.getShortUrl(History.getLocationHref())) ) {
					History.setHash(newStateHash,false);
				}

				History.busy(false);

				// End pushState closure
				return true;
			};

			/**
			 * History.replaceState(data,title,url)
			 * Replace the State and trigger onpopstate
			 * We have to trigger for HTML4 compatibility
			 * @param {object} data
			 * @param {string} title
			 * @param {string} url
			 * @return {true}
			 */
			History.replaceState = function(data,title,url,queue){
				//History.debug('History.replaceState: called', arguments);

				// We assume that the URL passed in is URI-encoded, but this makes
				// sure that it's fully URI encoded; any '%'s that are encoded are
				// converted back into '%'s
				url = encodeURI(url).replace(/%25/g, "%");

				// Check the State
				if ( History.getHashByUrl(url) ) {
					throw new Error('History.js does not support states with fragment-identifiers (hashes/anchors).');
				}

				// Handle Queueing
				if ( queue !== false && History.busy() ) {
					// Wait + Push to Queue
					//History.debug('History.replaceState: we must wait', arguments);
					History.pushQueue({
						scope: History,
						callback: History.replaceState,
						args: arguments,
						queue: queue
					});
					return false;
				}

				// Make Busy
				History.busy(true);

				// Fetch the State Objects
				var newState        = History.createStateObject(data,title,url),
					newStateHash = History.getHashByState(newState),
					oldState        = History.getState(false),
					oldStateHash = History.getHashByState(oldState),
					previousState   = History.getStateByIndex(-2);

				// Discard Old State
				History.discardState(oldState,newState,previousState);

				// If the url hasn't changed, just store and save the state
				// and fire a statechange event to be consistent with the
				// html 5 api
				if ( newStateHash === oldStateHash ) {
					// Store the newState
					History.storeState(newState);
					History.expectedStateId = newState.id;

					// Recycle the State
					History.recycleState(newState);

					// Force update of the title
					History.setTitle(newState);

					// Update HTML5 State
					History.saveState(newState);

					// Fire HTML5 Event
					//History.debug('History.pushState: trigger popstate');
					History.Adapter.trigger(window,'statechange');
					History.busy(false);
				}
				else {
					// Alias to PushState
					History.pushState(newState.data,newState.title,newState.url,false);
				}

				// End replaceState closure
				return true;
			};

		} // History.emulated.pushState



		// ====================================================================
		// Initialise

		// Non-Native pushState Implementation
		if ( History.emulated.pushState ) {
			/**
			 * Ensure initial state is handled correctly
			 */
			if ( History.getHash() && !History.emulated.hashChange ) {
				History.Adapter.onDomLoad(function(){
					History.Adapter.trigger(window,'hashchange');
				});
			}

		} // History.emulated.pushState

	}; // History.initHtml4

	// Try to Initialise History
	if ( typeof History.init !== 'undefined' ) {
		History.init();
	}

})(window);


 /**
  * History.js Native Adapter
  * @author Benjamin Arthur Lupton <contact@balupton.com>
  * @copyright 2010-2011 Benjamin Arthur Lupton <contact@balupton.com>
  * @license New BSD License <http://creativecommons.org/licenses/BSD/>
  */

 // Closure
 (function(window,undefined){
 	"use strict";

 	// Localise Globals
 	var History = window.History = window.History||{};

 	// Check Existence
 	if ( typeof History.Adapter !== 'undefined' ) {
 		throw new Error('History.js Adapter has already been loaded...');
 	}

 	// Add the Adapter
 	History.Adapter = {
 		/**
 		 * History.Adapter.handlers[uid][eventName] = Array
 		 */
 		handlers: {},

 		/**
 		 * History.Adapter._uid
 		 * The current element unique identifier
 		 */
 		_uid: 1,

 		/**
 		 * History.Adapter.uid(element)
 		 * @param {Element} element
 		 * @return {String} uid
 		 */
 		uid: function(element){
 			return element._uid || (element._uid = History.Adapter._uid++);
 		},

 		/**
 		 * History.Adapter.bind(el,event,callback)
 		 * @param {Element} element
 		 * @param {String} eventName - custom and standard events
 		 * @param {Function} callback
 		 * @return
 		 */
 		bind: function(element,eventName,callback){
 			// Prepare
 			var uid = History.Adapter.uid(element);

 			// Apply Listener
 			History.Adapter.handlers[uid] = History.Adapter.handlers[uid] || {};
 			History.Adapter.handlers[uid][eventName] = History.Adapter.handlers[uid][eventName] || [];
 			History.Adapter.handlers[uid][eventName].push(callback);

 			// Bind Global Listener
 			element['on'+eventName] = (function(element,eventName){
 				return function(event){
 					History.Adapter.trigger(element,eventName,event);
 				};
 			})(element,eventName);
 		},

 		/**
 		 * History.Adapter.trigger(el,event)
 		 * @param {Element} element
 		 * @param {String} eventName - custom and standard events
 		 * @param {Object} event - a object of event data
 		 * @return
 		 */
 		trigger: function(element,eventName,event){
 			// Prepare
 			event = event || {};
 			var uid = History.Adapter.uid(element),
 				i,n;

 			// Apply Listener
 			History.Adapter.handlers[uid] = History.Adapter.handlers[uid] || {};
 			History.Adapter.handlers[uid][eventName] = History.Adapter.handlers[uid][eventName] || [];

 			// Fire Listeners
 			for ( i=0,n=History.Adapter.handlers[uid][eventName].length; i<n; ++i ) {
 				History.Adapter.handlers[uid][eventName][i].apply(this,[event]);
 			}
 		},

 		/**
 		 * History.Adapter.extractEventData(key,event,extra)
 		 * @param {String} key - key for the event data to extract
 		 * @param {String} event - custom and standard events
 		 * @return {mixed}
 		 */
 		extractEventData: function(key,event){
 			var result = (event && event[key]) || undefined;
 			return result;
 		},

 		/**
 		 * History.Adapter.onDomLoad(callback)
 		 * @param {Function} callback
 		 * @return
 		 */
 		onDomLoad: function(callback) {
 			var timeout = window.setTimeout(function(){
 				callback();
 			},2000);
 			window.onload = function(){
 				clearTimeout(timeout);
 				callback();
 			};
 		}
 	};

 	// Try to Initialise History
 	if ( typeof History.init !== 'undefined' ) {
 		History.init();
 	}

 })(window);

 /**
  * History.js Core
  * @author Benjamin Arthur Lupton <contact@balupton.com>
  * @copyright 2010-2011 Benjamin Arthur Lupton <contact@balupton.com>
  * @license New BSD License <http://creativecommons.org/licenses/BSD/>
  */
(function(window,undefined){
	"use strict";

	// ========================================================================
	// Initialise

	// Localise Globals
	var
		console = window.console||undefined, // Prevent a JSLint complain
		document = window.document, // Make sure we are using the correct document
		navigator = window.navigator, // Make sure we are using the correct navigator
		sessionStorage = false, // sessionStorage
		setTimeout = window.setTimeout,
		clearTimeout = window.clearTimeout,
		setInterval = window.setInterval,
		clearInterval = window.clearInterval,
		JSON = window.JSON,
		alert = window.alert,
		History = window.History = window.History||{}, // Public History Object
		history = window.history; // Old History Object

	try {
		sessionStorage = window.sessionStorage; // This will throw an exception in some browsers when cookies/localStorage are explicitly disabled (i.e. Chrome)
		sessionStorage.setItem('TEST', '1');
		sessionStorage.removeItem('TEST');
	} catch(e) {
		sessionStorage = false;
	}

	// MooTools Compatibility
	JSON.stringify = JSON.stringify||JSON.encode;
	JSON.parse = JSON.parse||JSON.decode;

	// Check Existence
	if ( typeof History.init !== 'undefined' ) {
		throw new Error('History.js Core has already been loaded...');
	}

	// Initialise History
	History.init = function(options){
		// Check Load Status of Adapter
		if ( typeof History.Adapter === 'undefined' ) {
			return false;
		}

		// Check Load Status of Core
		if ( typeof History.initCore !== 'undefined' ) {
			History.initCore();
		}

		// Check Load Status of HTML4 Support
		if ( typeof History.initHtml4 !== 'undefined' ) {
			History.initHtml4();
		}

		// Return true
		return true;
	};


	// ========================================================================
	// Initialise Core

	// Initialise Core
	History.initCore = function(options){
		// Initialise
		if ( typeof History.initCore.initialized !== 'undefined' ) {
			// Already Loaded
			return false;
		}
		else {
			History.initCore.initialized = true;
		}


		// ====================================================================
		// Options

		/**
		 * History.options
		 * Configurable options
		 */
		History.options = History.options||{};

		/**
		 * History.options.hashChangeInterval
		 * How long should the interval be before hashchange checks
		 */
		History.options.hashChangeInterval = History.options.hashChangeInterval || 100;

		/**
		 * History.options.safariPollInterval
		 * How long should the interval be before safari poll checks
		 */
		History.options.safariPollInterval = History.options.safariPollInterval || 500;

		/**
		 * History.options.doubleCheckInterval
		 * How long should the interval be before we perform a double check
		 */
		History.options.doubleCheckInterval = History.options.doubleCheckInterval || 500;

		/**
		 * History.options.disableSuid
		 * Force History not to append suid
		 */
		History.options.disableSuid = History.options.disableSuid || false;

		/**
		 * History.options.storeInterval
		 * How long should we wait between store calls
		 */
		History.options.storeInterval = History.options.storeInterval || 1000;

		/**
		 * History.options.busyDelay
		 * How long should we wait between busy events
		 */
		History.options.busyDelay = History.options.busyDelay || 250;

		/**
		 * History.options.debug
		 * If true will enable debug messages to be logged
		 */
		History.options.debug = History.options.debug || false;

		/**
		 * History.options.initialTitle
		 * What is the title of the initial state
		 */
		History.options.initialTitle = History.options.initialTitle || document.title;

		/**
		 * History.options.html4Mode
		 * If true, will force HTMl4 mode (hashtags)
		 */
		History.options.html4Mode = History.options.html4Mode || false;

		/**
		 * History.options.delayInit
		 * Want to override default options and call init manually.
		 */
		History.options.delayInit = History.options.delayInit || false;


		// ====================================================================
		// Interval record

		/**
		 * History.intervalList
		 * List of intervals set, to be cleared when document is unloaded.
		 */
		History.intervalList = [];

		/**
		 * History.clearAllIntervals
		 * Clears all setInterval instances.
		 */
		History.clearAllIntervals = function(){
			var i, il = History.intervalList;
			if (typeof il !== "undefined" && il !== null) {
				for (i = 0; i < il.length; i++) {
					clearInterval(il[i]);
				}
				History.intervalList = null;
			}
		};


		// ====================================================================
		// Debug

		/**
		 * History.debug(message,...)
		 * Logs the passed arguments if debug enabled
		 */
		History.debug = function(){
			if ( (History.options.debug||false) ) {
				History.log.apply(History,arguments);
			}
		};

		/**
		 * History.log(message,...)
		 * Logs the passed arguments
		 */
		History.log = function(){
			// Prepare
			var
				consoleExists = !(typeof console === 'undefined' || typeof console.log === 'undefined' || typeof console.log.apply === 'undefined'),
				textarea = document.getElementById('log'),
				message,
				i,n,
				args,arg
				;

			// Write to Console
			if ( consoleExists ) {
				args = Array.prototype.slice.call(arguments);
				message = args.shift();
				if ( typeof console.debug !== 'undefined' ) {
					console.debug.apply(console,[message,args]);
				}
				else {
					console.log.apply(console,[message,args]);
				}
			}
			else {
				message = ("\n"+arguments[0]+"\n");
			}

			// Write to log
			for ( i=1,n=arguments.length; i<n; ++i ) {
				arg = arguments[i];
				if ( typeof arg === 'object' && typeof JSON !== 'undefined' ) {
					try {
						arg = JSON.stringify(arg);
					}
					catch ( Exception ) {
						// Recursive Object
					}
				}
				message += "\n"+arg+"\n";
			}

			// Textarea
			if ( textarea ) {
				textarea.value += message+"\n-----\n";
				textarea.scrollTop = textarea.scrollHeight - textarea.clientHeight;
			}
			// No Textarea, No Console
			else if ( !consoleExists ) {
				alert(message);
			}

			// Return true
			return true;
		};


		// ====================================================================
		// Emulated Status

		/**
		 * History.getInternetExplorerMajorVersion()
		 * Get's the major version of Internet Explorer
		 * @return {integer}
		 * @license Public Domain
		 * @author Benjamin Arthur Lupton <contact@balupton.com>
		 * @author James Padolsey <https://gist.github.com/527683>
		 */
		History.getInternetExplorerMajorVersion = function(){
			var result = History.getInternetExplorerMajorVersion.cached =
					(typeof History.getInternetExplorerMajorVersion.cached !== 'undefined')
				?	History.getInternetExplorerMajorVersion.cached
				:	(function(){
						var v = 3,
								div = document.createElement('div'),
								all = div.getElementsByTagName('i');
						while ( (div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->') && all[0] ) {}
						return (v > 4) ? v : false;
					})()
				;
			return result;
		};

		/**
		 * History.isInternetExplorer()
		 * Are we using Internet Explorer?
		 * @return {boolean}
		 * @license Public Domain
		 * @author Benjamin Arthur Lupton <contact@balupton.com>
		 */
		History.isInternetExplorer = function(){
			var result =
				History.isInternetExplorer.cached =
				(typeof History.isInternetExplorer.cached !== 'undefined')
					?	History.isInternetExplorer.cached
					:	Boolean(History.getInternetExplorerMajorVersion())
				;
			return result;
		};

		/**
		 * History.emulated
		 * Which features require emulating?
		 */

		if (History.options.html4Mode) {
			History.emulated = {
				pushState : true,
				hashChange: true
			};
		}

		else {

			History.emulated = {
				pushState: !Boolean(
					window.history && window.history.pushState && window.history.replaceState
					&& !(
						(/ Mobile\/([1-7][a-z]|(8([abcde]|f(1[0-8]))))/i).test(navigator.userAgent) /* disable for versions of iOS before version 4.3 (8F190) */
						|| (/AppleWebKit\/5([0-2]|3[0-2])/i).test(navigator.userAgent) /* disable for the mercury iOS browser, or at least older versions of the webkit engine */
					)
				),
				hashChange: Boolean(
					!(('onhashchange' in window) || ('onhashchange' in document))
					||
					(History.isInternetExplorer() && History.getInternetExplorerMajorVersion() < 8)
				)
			};
		}

		/**
		 * History.enabled
		 * Is History enabled?
		 */
		History.enabled = !History.emulated.pushState;

		/**
		 * History.bugs
		 * Which bugs are present
		 */
		History.bugs = {
			/**
			 * Safari 5 and Safari iOS 4 fail to return to the correct state once a hash is replaced by a `replaceState` call
			 * https://bugs.webkit.org/show_bug.cgi?id=56249
			 */
			setHash: Boolean(!History.emulated.pushState && navigator.vendor === 'Apple Computer, Inc.' && /AppleWebKit\/5([0-2]|3[0-3])/.test(navigator.userAgent)),

			/**
			 * Safari 5 and Safari iOS 4 sometimes fail to apply the state change under busy conditions
			 * https://bugs.webkit.org/show_bug.cgi?id=42940
			 */
			safariPoll: Boolean(!History.emulated.pushState && navigator.vendor === 'Apple Computer, Inc.' && /AppleWebKit\/5([0-2]|3[0-3])/.test(navigator.userAgent)),

			/**
			 * MSIE 6 and 7 sometimes do not apply a hash even it was told to (requiring a second call to the apply function)
			 */
			ieDoubleCheck: Boolean(History.isInternetExplorer() && History.getInternetExplorerMajorVersion() < 8),

			/**
			 * MSIE 6 requires the entire hash to be encoded for the hashes to trigger the onHashChange event
			 */
			hashEscape: Boolean(History.isInternetExplorer() && History.getInternetExplorerMajorVersion() < 7)
		};

		/**
		 * History.isEmptyObject(obj)
		 * Checks to see if the Object is Empty
		 * @param {Object} obj
		 * @return {boolean}
		 */
		History.isEmptyObject = function(obj) {
			for ( var name in obj ) {
				if ( obj.hasOwnProperty(name) ) {
					return false;
				}
			}
			return true;
		};

		/**
		 * History.cloneObject(obj)
		 * Clones a object and eliminate all references to the original contexts
		 * @param {Object} obj
		 * @return {Object}
		 */
		History.cloneObject = function(obj) {
			var hash,newObj;
			if ( obj ) {
				hash = JSON.stringify(obj);
				newObj = JSON.parse(hash);
			}
			else {
				newObj = {};
			}
			return newObj;
		};


		// ====================================================================
		// URL Helpers

		/**
		 * History.getRootUrl()
		 * Turns "http://mysite.com/dir/page.html?asd" into "http://mysite.com"
		 * @return {String} rootUrl
		 */
		History.getRootUrl = function(){
			// Create
			var rootUrl = document.location.protocol+'//'+(document.location.hostname||document.location.host);
			if ( document.location.port||false ) {
				rootUrl += ':'+document.location.port;
			}
			rootUrl += '/';

			// Return
			return rootUrl;
		};

		/**
		 * History.getBaseHref()
		 * Fetches the `href` attribute of the `<base href="...">` element if it exists
		 * @return {String} baseHref
		 */
		History.getBaseHref = function(){
			// Create
			var
				baseElements = document.getElementsByTagName('base'),
				baseElement = null,
				baseHref = '';

			// Test for Base Element
			if ( baseElements.length === 1 ) {
				// Prepare for Base Element
				baseElement = baseElements[0];
				baseHref = baseElement.href.replace(/[^\/]+$/,'');
			}

			// Adjust trailing slash
			baseHref = baseHref.replace(/\/+$/,'');
			if ( baseHref ) baseHref += '/';

			// Return
			return baseHref;
		};

		/**
		 * History.getBaseUrl()
		 * Fetches the baseHref or basePageUrl or rootUrl (whichever one exists first)
		 * @return {String} baseUrl
		 */
		History.getBaseUrl = function(){
			// Create
			var baseUrl = History.getBaseHref()||History.getBasePageUrl()||History.getRootUrl();

			// Return
			return baseUrl;
		};

		/**
		 * History.getPageUrl()
		 * Fetches the URL of the current page
		 * @return {String} pageUrl
		 */
		History.getPageUrl = function(){
			// Fetch
			var
				State = History.getState(false,false),
				stateUrl = (State||{}).url||History.getLocationHref(),
				pageUrl;

			// Create
			pageUrl = stateUrl.replace(/\/+$/,'').replace(/[^\/]+$/,function(part,index,string){
				return (/\./).test(part) ? part : part+'/';
			});

			// Return
			return pageUrl;
		};

		/**
		 * History.getBasePageUrl()
		 * Fetches the Url of the directory of the current page
		 * @return {String} basePageUrl
		 */
		History.getBasePageUrl = function(){
			// Create
			var basePageUrl = (History.getLocationHref()).replace(/[#\?].*/,'').replace(/[^\/]+$/,function(part,index,string){
				return (/[^\/]$/).test(part) ? '' : part;
			}).replace(/\/+$/,'')+'/';

			// Return
			return basePageUrl;
		};

		/**
		 * History.getFullUrl(url)
		 * Ensures that we have an absolute URL and not a relative URL
		 * @param {string} url
		 * @param {Boolean} allowBaseHref
		 * @return {string} fullUrl
		 */
		History.getFullUrl = function(url,allowBaseHref){
			// Prepare
			var fullUrl = url, firstChar = url.substring(0,1);
			allowBaseHref = (typeof allowBaseHref === 'undefined') ? true : allowBaseHref;

			// Check
			if ( /[a-z]+\:\/\//.test(url) ) {
				// Full URL
			}
			else if ( firstChar === '/' ) {
				// Root URL
				fullUrl = History.getRootUrl()+url.replace(/^\/+/,'');
			}
			else if ( firstChar === '#' ) {
				// Anchor URL
				fullUrl = History.getPageUrl().replace(/#.*/,'')+url;
			}
			else if ( firstChar === '?' ) {
				// Query URL
				fullUrl = History.getPageUrl().replace(/[\?#].*/,'')+url;
			}
			else {
				// Relative URL
				if ( allowBaseHref ) {
					fullUrl = History.getBaseUrl()+url.replace(/^(\.\/)+/,'');
				} else {
					fullUrl = History.getBasePageUrl()+url.replace(/^(\.\/)+/,'');
				}
				// We have an if condition above as we do not want hashes
				// which are relative to the baseHref in our URLs
				// as if the baseHref changes, then all our bookmarks
				// would now point to different locations
				// whereas the basePageUrl will always stay the same
			}

			// Return
			return fullUrl.replace(/\#$/,'');
		};

		/**
		 * History.getShortUrl(url)
		 * Ensures that we have a relative URL and not a absolute URL
		 * @param {string} url
		 * @return {string} url
		 */
		History.getShortUrl = function(url){
			// Prepare
			var shortUrl = url, baseUrl = History.getBaseUrl(), rootUrl = History.getRootUrl();

			// Trim baseUrl
			if ( History.emulated.pushState ) {
				// We are in a if statement as when pushState is not emulated
				// The actual url these short urls are relative to can change
				// So within the same session, we the url may end up somewhere different
				shortUrl = shortUrl.replace(baseUrl,'');
			}

			// Trim rootUrl
			shortUrl = shortUrl.replace(rootUrl,'/');

			// Ensure we can still detect it as a state
			if ( History.isTraditionalAnchor(shortUrl) ) {
				shortUrl = './'+shortUrl;
			}

			// Clean It
			shortUrl = shortUrl.replace(/^(\.\/)+/g,'./').replace(/\#$/,'');

			// Return
			return shortUrl;
		};

		/**
		 * History.getLocationHref(document)
		 * Returns a normalized version of document.location.href
		 * accounting for browser inconsistencies, etc.
		 *
		 * This URL will be URI-encoded and will include the hash
		 *
		 * @param {object} document
		 * @return {string} url
		 */
		History.getLocationHref = function(doc) {
			doc = doc || document;

			// most of the time, this will be true
			if (doc.URL === doc.location.href)
				return doc.location.href;

			// some versions of webkit URI-decode document.location.href
			// but they leave document.URL in an encoded state
			if (doc.location.href === decodeURIComponent(doc.URL))
				return doc.URL;

			// FF 3.6 only updates document.URL when a page is reloaded
			// document.location.href is updated correctly
			if (doc.location.hash && decodeURIComponent(doc.location.href.replace(/^[^#]+/, "")) === doc.location.hash)
				return doc.location.href;

			if (doc.URL.indexOf('#') == -1 && doc.location.href.indexOf('#') != -1)
				return doc.location.href;

			return doc.URL || doc.location.href;
		};


		// ====================================================================
		// State Storage

		/**
		 * History.store
		 * The store for all session specific data
		 */
		History.store = {};

		/**
		 * History.idToState
		 * 1-1: State ID to State Object
		 */
		History.idToState = History.idToState||{};

		/**
		 * History.stateToId
		 * 1-1: State String to State ID
		 */
		History.stateToId = History.stateToId||{};

		/**
		 * History.urlToId
		 * 1-1: State URL to State ID
		 */
		History.urlToId = History.urlToId||{};

		/**
		 * History.storedStates
		 * Store the states in an array
		 */
		History.storedStates = History.storedStates||[];

		/**
		 * History.savedStates
		 * Saved the states in an array
		 */
		History.savedStates = History.savedStates||[];

		/**
		 * History.noramlizeStore()
		 * Noramlize the store by adding necessary values
		 */
		History.normalizeStore = function(){
			History.store.idToState = History.store.idToState||{};
			History.store.urlToId = History.store.urlToId||{};
			History.store.stateToId = History.store.stateToId||{};
		};

		/**
		 * History.getState()
		 * Get an object containing the data, title and url of the current state
		 * @param {Boolean} friendly
		 * @param {Boolean} create
		 * @return {Object} State
		 */
		History.getState = function(friendly,create){
			// Prepare
			if ( typeof friendly === 'undefined' ) { friendly = true; }
			if ( typeof create === 'undefined' ) { create = true; }

			// Fetch
			var State = History.getLastSavedState();

			// Create
			if ( !State && create ) {
				State = History.createStateObject();
			}

			// Adjust
			if ( friendly ) {
				State = History.cloneObject(State);
				State.url = State.cleanUrl||State.url;
			}

			// Return
			return State;
		};

		/**
		 * History.getIdByState(State)
		 * Gets a ID for a State
		 * @param {State} newState
		 * @return {String} id
		 */
		History.getIdByState = function(newState){

			// Fetch ID
			var id = History.extractId(newState.url),
				str;

			if ( !id ) {
				// Find ID via State String
				str = History.getStateString(newState);
				if ( typeof History.stateToId[str] !== 'undefined' ) {
					id = History.stateToId[str];
				}
				else if ( typeof History.store.stateToId[str] !== 'undefined' ) {
					id = History.store.stateToId[str];
				}
				else {
					// Generate a new ID
					while ( true ) {
						id = (new Date()).getTime() + String(Math.random()).replace(/\D/g,'');
						if ( typeof History.idToState[id] === 'undefined' && typeof History.store.idToState[id] === 'undefined' ) {
							break;
						}
					}

					// Apply the new State to the ID
					History.stateToId[str] = id;
					History.idToState[id] = newState;
				}
			}

			// Return ID
			return id;
		};

		/**
		 * History.normalizeState(State)
		 * Expands a State Object
		 * @param {object} State
		 * @return {object}
		 */
		History.normalizeState = function(oldState){
			// Variables
			var newState, dataNotEmpty;

			// Prepare
			if ( !oldState || (typeof oldState !== 'object') ) {
				oldState = {};
			}

			// Check
			if ( typeof oldState.normalized !== 'undefined' ) {
				return oldState;
			}

			// Adjust
			if ( !oldState.data || (typeof oldState.data !== 'object') ) {
				oldState.data = {};
			}

			// ----------------------------------------------------------------

			// Create
			newState = {};
			newState.normalized = true;
			newState.title = oldState.title||'';
			newState.url = History.getFullUrl(oldState.url?oldState.url:(History.getLocationHref()));
			newState.hash = History.getShortUrl(newState.url);
			newState.data = History.cloneObject(oldState.data);

			// Fetch ID
			newState.id = History.getIdByState(newState);

			// ----------------------------------------------------------------

			// Clean the URL
			newState.cleanUrl = newState.url.replace(/\??\&_suid.*/,'');
			newState.url = newState.cleanUrl;

			// Check to see if we have more than just a url
			dataNotEmpty = !History.isEmptyObject(newState.data);

			// Apply
			if ( (newState.title || dataNotEmpty) && History.options.disableSuid !== true ) {
				// Add ID to Hash
				newState.hash = History.getShortUrl(newState.url).replace(/\??\&_suid.*/,'');
				if ( !/\?/.test(newState.hash) ) {
					newState.hash += '?';
				}
				newState.hash += '&_suid='+newState.id;
			}

			// Create the Hashed URL
			newState.hashedUrl = History.getFullUrl(newState.hash);

			// ----------------------------------------------------------------

			// Update the URL if we have a duplicate
			if ( (History.emulated.pushState || History.bugs.safariPoll) && History.hasUrlDuplicate(newState) ) {
				newState.url = newState.hashedUrl;
			}

			// ----------------------------------------------------------------

			// Return
			return newState;
		};

		/**
		 * History.createStateObject(data,title,url)
		 * Creates a object based on the data, title and url state params
		 * @param {object} data
		 * @param {string} title
		 * @param {string} url
		 * @return {object}
		 */
		History.createStateObject = function(data,title,url){
			// Hashify
			var State = {
				'data': data,
				'title': title,
				'url': url
			};

			// Expand the State
			State = History.normalizeState(State);

			// Return object
			return State;
		};

		/**
		 * History.getStateById(id)
		 * Get a state by it's UID
		 * @param {String} id
		 */
		History.getStateById = function(id){
			// Prepare
			id = String(id);

			// Retrieve
			var State = History.idToState[id] || History.store.idToState[id] || undefined;

			// Return State
			return State;
		};

		/**
		 * Get a State's String
		 * @param {State} passedState
		 */
		History.getStateString = function(passedState){
			// Prepare
			var State, cleanedState, str;

			// Fetch
			State = History.normalizeState(passedState);

			// Clean
			cleanedState = {
				data: State.data,
				title: passedState.title,
				url: passedState.url
			};

			// Fetch
			str = JSON.stringify(cleanedState);

			// Return
			return str;
		};

		/**
		 * Get a State's ID
		 * @param {State} passedState
		 * @return {String} id
		 */
		History.getStateId = function(passedState){
			// Prepare
			var State, id;

			// Fetch
			State = History.normalizeState(passedState);

			// Fetch
			id = State.id;

			// Return
			return id;
		};

		/**
		 * History.getHashByState(State)
		 * Creates a Hash for the State Object
		 * @param {State} passedState
		 * @return {String} hash
		 */
		History.getHashByState = function(passedState){
			// Prepare
			var State, hash;

			// Fetch
			State = History.normalizeState(passedState);

			// Hash
			hash = State.hash;

			// Return
			return hash;
		};

		/**
		 * History.extractId(url_or_hash)
		 * Get a State ID by it's URL or Hash
		 * @param {string} url_or_hash
		 * @return {string} id
		 */
		History.extractId = function ( url_or_hash ) {
			// Prepare
			var id,parts,url, tmp;

			// Extract

			// If the URL has a #, use the id from before the #
			if (url_or_hash.indexOf('#') != -1)
			{
				tmp = url_or_hash.split("#")[0];
			}
			else
			{
				tmp = url_or_hash;
			}

			parts = /(.*)\&_suid=([0-9]+)$/.exec(tmp);
			url = parts ? (parts[1]||url_or_hash) : url_or_hash;
			id = parts ? String(parts[2]||'') : '';

			// Return
			return id||false;
		};

		/**
		 * History.isTraditionalAnchor
		 * Checks to see if the url is a traditional anchor or not
		 * @param {String} url_or_hash
		 * @return {Boolean}
		 */
		History.isTraditionalAnchor = function(url_or_hash){
			// Check
			var isTraditional = !(/[\/\?\.]/.test(url_or_hash));

			// Return
			return isTraditional;
		};

		/**
		 * History.extractState
		 * Get a State by it's URL or Hash
		 * @param {String} url_or_hash
		 * @return {State|null}
		 */
		History.extractState = function(url_or_hash,create){
			// Prepare
			var State = null, id, url;
			create = create||false;

			// Fetch SUID
			id = History.extractId(url_or_hash);
			if ( id ) {
				State = History.getStateById(id);
			}

			// Fetch SUID returned no State
			if ( !State ) {
				// Fetch URL
				url = History.getFullUrl(url_or_hash);

				// Check URL
				id = History.getIdByUrl(url)||false;
				if ( id ) {
					State = History.getStateById(id);
				}

				// Create State
				if ( !State && create && !History.isTraditionalAnchor(url_or_hash) ) {
					State = History.createStateObject(null,null,url);
				}
			}

			// Return
			return State;
		};

		/**
		 * History.getIdByUrl()
		 * Get a State ID by a State URL
		 */
		History.getIdByUrl = function(url){
			// Fetch
			var id = History.urlToId[url] || History.store.urlToId[url] || undefined;

			// Return
			return id;
		};

		/**
		 * History.getLastSavedState()
		 * Get an object containing the data, title and url of the current state
		 * @return {Object} State
		 */
		History.getLastSavedState = function(){
			return History.savedStates[History.savedStates.length-1]||undefined;
		};

		/**
		 * History.getLastStoredState()
		 * Get an object containing the data, title and url of the current state
		 * @return {Object} State
		 */
		History.getLastStoredState = function(){
			return History.storedStates[History.storedStates.length-1]||undefined;
		};

		/**
		 * History.hasUrlDuplicate
		 * Checks if a Url will have a url conflict
		 * @param {Object} newState
		 * @return {Boolean} hasDuplicate
		 */
		History.hasUrlDuplicate = function(newState) {
			// Prepare
			var hasDuplicate = false,
				oldState;

			// Fetch
			oldState = History.extractState(newState.url);

			// Check
			hasDuplicate = oldState && oldState.id !== newState.id;

			// Return
			return hasDuplicate;
		};

		/**
		 * History.storeState
		 * Store a State
		 * @param {Object} newState
		 * @return {Object} newState
		 */
		History.storeState = function(newState){
			// Store the State
			History.urlToId[newState.url] = newState.id;

			// Push the State
			History.storedStates.push(History.cloneObject(newState));

			// Return newState
			return newState;
		};

		/**
		 * History.isLastSavedState(newState)
		 * Tests to see if the state is the last state
		 * @param {Object} newState
		 * @return {boolean} isLast
		 */
		History.isLastSavedState = function(newState){
			// Prepare
			var isLast = false,
				newId, oldState, oldId;

			// Check
			if ( History.savedStates.length ) {
				newId = newState.id;
				oldState = History.getLastSavedState();
				oldId = oldState.id;

				// Check
				isLast = (newId === oldId);
			}

			// Return
			return isLast;
		};

		/**
		 * History.saveState
		 * Push a State
		 * @param {Object} newState
		 * @return {boolean} changed
		 */
		History.saveState = function(newState){
			// Check Hash
			if ( History.isLastSavedState(newState) ) {
				return false;
			}

			// Push the State
			History.savedStates.push(History.cloneObject(newState));

			// Return true
			return true;
		};

		/**
		 * History.getStateByIndex()
		 * Gets a state by the index
		 * @param {integer} index
		 * @return {Object}
		 */
		History.getStateByIndex = function(index){
			// Prepare
			var State = null;

			// Handle
			if ( typeof index === 'undefined' ) {
				// Get the last inserted
				State = History.savedStates[History.savedStates.length-1];
			}
			else if ( index < 0 ) {
				// Get from the end
				State = History.savedStates[History.savedStates.length+index];
			}
			else {
				// Get from the beginning
				State = History.savedStates[index];
			}

			// Return State
			return State;
		};

		/**
		 * History.getCurrentIndex()
		 * Gets the current index
		 * @return (integer)
		*/
		History.getCurrentIndex = function(){
			// Prepare
			var index = null;

			// No states saved
			if(History.savedStates.length < 1) {
				index = 0;
			}
			else {
				index = History.savedStates.length-1;
			}
			return index;
		};

		// ====================================================================
		// Hash Helpers

		/**
		 * History.getHash()
		 * @param {Location=} location
		 * Gets the current document hash
		 * Note: unlike location.hash, this is guaranteed to return the escaped hash in all browsers
		 * @return {string}
		 */
		History.getHash = function(doc){
			var url = History.getLocationHref(doc),
				hash;
			hash = History.getHashByUrl(url);
			return hash;
		};

		/**
		 * History.unescapeHash()
		 * normalize and Unescape a Hash
		 * @param {String} hash
		 * @return {string}
		 */
		History.unescapeHash = function(hash){
			// Prepare
			var result = History.normalizeHash(hash);

			// Unescape hash
			result = decodeURIComponent(result);

			// Return result
			return result;
		};

		/**
		 * History.normalizeHash()
		 * normalize a hash across browsers
		 * @return {string}
		 */
		History.normalizeHash = function(hash){
			// Prepare
			var result = hash.replace(/[^#]*#/,'').replace(/#.*/, '');

			// Return result
			return result;
		};

		/**
		 * History.setHash(hash)
		 * Sets the document hash
		 * @param {string} hash
		 * @return {History}
		 */
		History.setHash = function(hash,queue){
			// Prepare
			var State, pageUrl;

			// Handle Queueing
			if ( queue !== false && History.busy() ) {
				// Wait + Push to Queue
				//History.debug('History.setHash: we must wait', arguments);
				History.pushQueue({
					scope: History,
					callback: History.setHash,
					args: arguments,
					queue: queue
				});
				return false;
			}

			// Log
			//History.debug('History.setHash: called',hash);

			// Make Busy + Continue
			History.busy(true);

			// Check if hash is a state
			State = History.extractState(hash,true);
			if ( State && !History.emulated.pushState ) {
				// Hash is a state so skip the setHash
				//History.debug('History.setHash: Hash is a state so skipping the hash set with a direct pushState call',arguments);

				// PushState
				History.pushState(State.data,State.title,State.url,false);
			}
			else if ( History.getHash() !== hash ) {
				// Hash is a proper hash, so apply it

				// Handle browser bugs
				if ( History.bugs.setHash ) {
					// Fix Safari Bug https://bugs.webkit.org/show_bug.cgi?id=56249

					// Fetch the base page
					pageUrl = History.getPageUrl();

					// Safari hash apply
					History.pushState(null,null,pageUrl+'#'+hash,false);
				}
				else {
					// Normal hash apply
					document.location.hash = hash;
				}
			}

			// Chain
			return History;
		};

		/**
		 * History.escape()
		 * normalize and Escape a Hash
		 * @return {string}
		 */
		History.escapeHash = function(hash){
			// Prepare
			var result = History.normalizeHash(hash);

			// Escape hash
			result = window.encodeURIComponent(result);

			// IE6 Escape Bug
			if ( !History.bugs.hashEscape ) {
				// Restore common parts
				result = result
					.replace(/\%21/g,'!')
					.replace(/\%26/g,'&')
					.replace(/\%3D/g,'=')
					.replace(/\%3F/g,'?');
			}

			// Return result
			return result;
		};

		/**
		 * History.getHashByUrl(url)
		 * Extracts the Hash from a URL
		 * @param {string} url
		 * @return {string} url
		 */
		History.getHashByUrl = function(url){
			// Extract the hash
			var hash = String(url)
				.replace(/([^#]*)#?([^#]*)#?(.*)/, '$2')
				;

			// Unescape hash
			hash = History.unescapeHash(hash);

			// Return hash
			return hash;
		};

		/**
		 * History.setTitle(title)
		 * Applies the title to the document
		 * @param {State} newState
		 * @return {Boolean}
		 */
		History.setTitle = function(newState){
			// Prepare
			var title = newState.title,
				firstState;

			// Initial
			if ( !title ) {
				firstState = History.getStateByIndex(0);
				if ( firstState && firstState.url === newState.url ) {
					title = firstState.title||History.options.initialTitle;
				}
			}

			// Apply
			try {
				document.getElementsByTagName('title')[0].innerHTML = title.replace('<','&lt;').replace('>','&gt;').replace(' & ',' &amp; ');
			}
			catch ( Exception ) { }
			document.title = title;

			// Chain
			return History;
		};


		// ====================================================================
		// Queueing

		/**
		 * History.queues
		 * The list of queues to use
		 * First In, First Out
		 */
		History.queues = [];

		/**
		 * History.busy(value)
		 * @param {boolean} value [optional]
		 * @return {boolean} busy
		 */
		History.busy = function(value){
			// Apply
			if ( typeof value !== 'undefined' ) {
				//History.debug('History.busy: changing ['+(History.busy.flag||false)+'] to ['+(value||false)+']', History.queues.length);
				History.busy.flag = value;
			}
			// Default
			else if ( typeof History.busy.flag === 'undefined' ) {
				History.busy.flag = false;
			}

			// Queue
			if ( !History.busy.flag ) {
				// Execute the next item in the queue
				clearTimeout(History.busy.timeout);
				var fireNext = function(){
					var i, queue, item;
					if ( History.busy.flag ) return;
					for ( i=History.queues.length-1; i >= 0; --i ) {
						queue = History.queues[i];
						if ( queue.length === 0 ) continue;
						item = queue.shift();
						History.fireQueueItem(item);
						History.busy.timeout = setTimeout(fireNext,History.options.busyDelay);
					}
				};
				History.busy.timeout = setTimeout(fireNext,History.options.busyDelay);
			}

			// Return
			return History.busy.flag;
		};

		/**
		 * History.busy.flag
		 */
		History.busy.flag = false;

		/**
		 * History.fireQueueItem(item)
		 * Fire a Queue Item
		 * @param {Object} item
		 * @return {Mixed} result
		 */
		History.fireQueueItem = function(item){
			return item.callback.apply(item.scope||History,item.args||[]);
		};

		/**
		 * History.pushQueue(callback,args)
		 * Add an item to the queue
		 * @param {Object} item [scope,callback,args,queue]
		 */
		History.pushQueue = function(item){
			// Prepare the queue
			History.queues[item.queue||0] = History.queues[item.queue||0]||[];

			// Add to the queue
			History.queues[item.queue||0].push(item);

			// Chain
			return History;
		};

		/**
		 * History.queue (item,queue), (func,queue), (func), (item)
		 * Either firs the item now if not busy, or adds it to the queue
		 */
		History.queue = function(item,queue){
			// Prepare
			if ( typeof item === 'function' ) {
				item = {
					callback: item
				};
			}
			if ( typeof queue !== 'undefined' ) {
				item.queue = queue;
			}

			// Handle
			if ( History.busy() ) {
				History.pushQueue(item);
			} else {
				History.fireQueueItem(item);
			}

			// Chain
			return History;
		};

		/**
		 * History.clearQueue()
		 * Clears the Queue
		 */
		History.clearQueue = function(){
			History.busy.flag = false;
			History.queues = [];
			return History;
		};


		// ====================================================================
		// IE Bug Fix

		/**
		 * History.stateChanged
		 * States whether or not the state has changed since the last double check was initialised
		 */
		History.stateChanged = false;

		/**
		 * History.doubleChecker
		 * Contains the timeout used for the double checks
		 */
		History.doubleChecker = false;

		/**
		 * History.doubleCheckComplete()
		 * Complete a double check
		 * @return {History}
		 */
		History.doubleCheckComplete = function(){
			// Update
			History.stateChanged = true;

			// Clear
			History.doubleCheckClear();

			// Chain
			return History;
		};

		/**
		 * History.doubleCheckClear()
		 * Clear a double check
		 * @return {History}
		 */
		History.doubleCheckClear = function(){
			// Clear
			if ( History.doubleChecker ) {
				clearTimeout(History.doubleChecker);
				History.doubleChecker = false;
			}

			// Chain
			return History;
		};

		/**
		 * History.doubleCheck()
		 * Create a double check
		 * @return {History}
		 */
		History.doubleCheck = function(tryAgain){
			// Reset
			History.stateChanged = false;
			History.doubleCheckClear();

			// Fix IE6,IE7 bug where calling history.back or history.forward does not actually change the hash (whereas doing it manually does)
			// Fix Safari 5 bug where sometimes the state does not change: https://bugs.webkit.org/show_bug.cgi?id=42940
			if ( History.bugs.ieDoubleCheck ) {
				// Apply Check
				History.doubleChecker = setTimeout(
					function(){
						History.doubleCheckClear();
						if ( !History.stateChanged ) {
							//History.debug('History.doubleCheck: State has not yet changed, trying again', arguments);
							// Re-Attempt
							tryAgain();
						}
						return true;
					},
					History.options.doubleCheckInterval
				);
			}

			// Chain
			return History;
		};


		// ====================================================================
		// Safari Bug Fix

		/**
		 * History.safariStatePoll()
		 * Poll the current state
		 * @return {History}
		 */
		History.safariStatePoll = function(){
			// Poll the URL

			// Get the Last State which has the new URL
			var
				urlState = History.extractState(History.getLocationHref()),
				newState;

			// Check for a difference
			if ( !History.isLastSavedState(urlState) ) {
				newState = urlState;
			}
			else {
				return;
			}

			// Check if we have a state with that url
			// If not create it
			if ( !newState ) {
				//History.debug('History.safariStatePoll: new');
				newState = History.createStateObject();
			}

			// Apply the New State
			//History.debug('History.safariStatePoll: trigger');
			History.Adapter.trigger(window,'popstate');

			// Chain
			return History;
		};


		// ====================================================================
		// State Aliases

		/**
		 * History.back(queue)
		 * Send the browser history back one item
		 * @param {Integer} queue [optional]
		 */
		History.back = function(queue){
			//History.debug('History.back: called', arguments);

			// Handle Queueing
			if ( queue !== false && History.busy() ) {
				// Wait + Push to Queue
				//History.debug('History.back: we must wait', arguments);
				History.pushQueue({
					scope: History,
					callback: History.back,
					args: arguments,
					queue: queue
				});
				return false;
			}

			// Make Busy + Continue
			History.busy(true);

			// Fix certain browser bugs that prevent the state from changing
			History.doubleCheck(function(){
				History.back(false);
			});

			// Go back
			history.go(-1);

			// End back closure
			return true;
		};

		/**
		 * History.forward(queue)
		 * Send the browser history forward one item
		 * @param {Integer} queue [optional]
		 */
		History.forward = function(queue){
			//History.debug('History.forward: called', arguments);

			// Handle Queueing
			if ( queue !== false && History.busy() ) {
				// Wait + Push to Queue
				//History.debug('History.forward: we must wait', arguments);
				History.pushQueue({
					scope: History,
					callback: History.forward,
					args: arguments,
					queue: queue
				});
				return false;
			}

			// Make Busy + Continue
			History.busy(true);

			// Fix certain browser bugs that prevent the state from changing
			History.doubleCheck(function(){
				History.forward(false);
			});

			// Go forward
			history.go(1);

			// End forward closure
			return true;
		};

		/**
		 * History.go(index,queue)
		 * Send the browser history back or forward index times
		 * @param {Integer} queue [optional]
		 */
		History.go = function(index,queue){
			//History.debug('History.go: called', arguments);

			// Prepare
			var i;

			// Handle
			if ( index > 0 ) {
				// Forward
				for ( i=1; i<=index; ++i ) {
					History.forward(queue);
				}
			}
			else if ( index < 0 ) {
				// Backward
				for ( i=-1; i>=index; --i ) {
					History.back(queue);
				}
			}
			else {
				throw new Error('History.go: History.go requires a positive or negative integer passed.');
			}

			// Chain
			return History;
		};


		// ====================================================================
		// HTML5 State Support

		// Non-Native pushState Implementation
		if ( History.emulated.pushState ) {
			/*
			 * Provide Skeleton for HTML4 Browsers
			 */

			// Prepare
			var emptyFunction = function(){};
			History.pushState = History.pushState||emptyFunction;
			History.replaceState = History.replaceState||emptyFunction;
		} // History.emulated.pushState

		// Native pushState Implementation
		else {
			/*
			 * Use native HTML5 History API Implementation
			 */

			/**
			 * History.onPopState(event,extra)
			 * Refresh the Current State
			 */
			History.onPopState = function(event,extra){
				// Prepare
				var stateId = false, newState = false, currentHash, currentState;

				// Reset the double check
				History.doubleCheckComplete();

				// Check for a Hash, and handle apporiatly
				currentHash = History.getHash();
				if ( currentHash ) {
					// Expand Hash
					currentState = History.extractState(currentHash||History.getLocationHref(),true);
					if ( currentState ) {
						// We were able to parse it, it must be a State!
						// Let's forward to replaceState
						//History.debug('History.onPopState: state anchor', currentHash, currentState);
						History.replaceState(currentState.data, currentState.title, currentState.url, false);
					}
					else {
						// Traditional Anchor
						//History.debug('History.onPopState: traditional anchor', currentHash);
						History.Adapter.trigger(window,'anchorchange');
						History.busy(false);
					}

					// We don't care for hashes
					History.expectedStateId = false;
					return false;
				}

				// Ensure
				stateId = History.Adapter.extractEventData('state',event,extra) || false;

				// Fetch State
				if ( stateId ) {
					// Vanilla: Back/forward button was used
					newState = History.getStateById(stateId);
				}
				else if ( History.expectedStateId ) {
					// Vanilla: A new state was pushed, and popstate was called manually
					newState = History.getStateById(History.expectedStateId);
				}
				else {
					// Initial State
					newState = History.extractState(History.getLocationHref());
				}

				// The State did not exist in our store
				if ( !newState ) {
					// Regenerate the State
					newState = History.createStateObject(null,null,History.getLocationHref());
				}

				// Clean
				History.expectedStateId = false;

				// Check if we are the same state
				if ( History.isLastSavedState(newState) ) {
					// There has been no change (just the page's hash has finally propagated)
					//History.debug('History.onPopState: no change', newState, History.savedStates);
					History.busy(false);
					return false;
				}

				// Store the State
				History.storeState(newState);
				History.saveState(newState);

				// Force update of the title
				History.setTitle(newState);

				// Fire Our Event
				History.Adapter.trigger(window,'statechange');
				History.busy(false);

				// Return true
				return true;
			};
			History.Adapter.bind(window,'popstate',History.onPopState);

			/**
			 * History.pushState(data,title,url)
			 * Add a new State to the history object, become it, and trigger onpopstate
			 * We have to trigger for HTML4 compatibility
			 * @param {object} data
			 * @param {string} title
			 * @param {string} url
			 * @return {true}
			 */
			History.pushState = function(data,title,url,queue){
				//History.debug('History.pushState: called', arguments);

				// Check the State
				if ( History.getHashByUrl(url) && History.emulated.pushState ) {
					throw new Error('History.js does not support states with fragement-identifiers (hashes/anchors).');
				}

				// Handle Queueing
				if ( queue !== false && History.busy() ) {
					// Wait + Push to Queue
					//History.debug('History.pushState: we must wait', arguments);
					History.pushQueue({
						scope: History,
						callback: History.pushState,
						args: arguments,
						queue: queue
					});
					return false;
				}

				// Make Busy + Continue
				History.busy(true);

				// Create the newState
				var newState = History.createStateObject(data,title,url);

				// Check it
				if ( History.isLastSavedState(newState) ) {
					// Won't be a change
					History.busy(false);
				}
				else {
					// Store the newState
					History.storeState(newState);
					History.expectedStateId = newState.id;

					// Push the newState
					history.pushState(newState.id,newState.title,newState.url);

					// Fire HTML5 Event
					History.Adapter.trigger(window,'popstate');
				}

				// End pushState closure
				return true;
			};

			/**
			 * History.replaceState(data,title,url)
			 * Replace the State and trigger onpopstate
			 * We have to trigger for HTML4 compatibility
			 * @param {object} data
			 * @param {string} title
			 * @param {string} url
			 * @return {true}
			 */
			History.replaceState = function(data,title,url,queue){
				//History.debug('History.replaceState: called', arguments);

				// Check the State
				if ( History.getHashByUrl(url) && History.emulated.pushState ) {
					throw new Error('History.js does not support states with fragement-identifiers (hashes/anchors).');
				}

				// Handle Queueing
				if ( queue !== false && History.busy() ) {
					// Wait + Push to Queue
					//History.debug('History.replaceState: we must wait', arguments);
					History.pushQueue({
						scope: History,
						callback: History.replaceState,
						args: arguments,
						queue: queue
					});
					return false;
				}

				// Make Busy + Continue
				History.busy(true);

				// Create the newState
				var newState = History.createStateObject(data,title,url);

				// Check it
				if ( History.isLastSavedState(newState) ) {
					// Won't be a change
					History.busy(false);
				}
				else {
					// Store the newState
					History.storeState(newState);
					History.expectedStateId = newState.id;

					// Push the newState
					history.replaceState(newState.id,newState.title,newState.url);

					// Fire HTML5 Event
					History.Adapter.trigger(window,'popstate');
				}

				// End replaceState closure
				return true;
			};

		} // !History.emulated.pushState


		// ====================================================================
		// Initialise

		/**
		 * Load the Store
		 */
		if ( sessionStorage ) {
			// Fetch
			try {
				History.store = JSON.parse(sessionStorage.getItem('History.store'))||{};
			}
			catch ( err ) {
				History.store = {};
			}

			// Normalize
			History.normalizeStore();
		}
		else {
			// Default Load
			History.store = {};
			History.normalizeStore();
		}

		/**
		 * Clear Intervals on exit to prevent memory leaks
		 */
		History.Adapter.bind(window,"unload",History.clearAllIntervals);

		/**
		 * Create the initial State
		 */
		History.saveState(History.storeState(History.extractState(History.getLocationHref(),true)));

		/**
		 * Bind for Saving Store
		 */
		if ( sessionStorage ) {
			// When the page is closed
			History.onUnload = function(){
				// Prepare
				var	currentStore, item, currentStoreString;

				// Fetch
				try {
					currentStore = JSON.parse(sessionStorage.getItem('History.store'))||{};
				}
				catch ( err ) {
					currentStore = {};
				}

				// Ensure
				currentStore.idToState = currentStore.idToState || {};
				currentStore.urlToId = currentStore.urlToId || {};
				currentStore.stateToId = currentStore.stateToId || {};

				// Sync
				for ( item in History.idToState ) {
					if ( !History.idToState.hasOwnProperty(item) ) {
						continue;
					}
					currentStore.idToState[item] = History.idToState[item];
				}
				for ( item in History.urlToId ) {
					if ( !History.urlToId.hasOwnProperty(item) ) {
						continue;
					}
					currentStore.urlToId[item] = History.urlToId[item];
				}
				for ( item in History.stateToId ) {
					if ( !History.stateToId.hasOwnProperty(item) ) {
						continue;
					}
					currentStore.stateToId[item] = History.stateToId[item];
				}

				// Update
				History.store = currentStore;
				History.normalizeStore();

				// In Safari, going into Private Browsing mode causes the
				// Session Storage object to still exist but if you try and use
				// or set any property/function of it it throws the exception
				// "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made to
				// add something to storage that exceeded the quota." infinitely
				// every second.
				currentStoreString = JSON.stringify(currentStore);
				try {
					// Store
					sessionStorage.setItem('History.store', currentStoreString);
				}
				catch (e) {
					if (e.code === DOMException.QUOTA_EXCEEDED_ERR) {
						if (sessionStorage.length) {
							// Workaround for a bug seen on iPads. Sometimes the quota exceeded error comes up and simply
							// removing/resetting the storage can work.
							sessionStorage.removeItem('History.store');
							sessionStorage.setItem('History.store', currentStoreString);
						} else {
							// Otherwise, we're probably private browsing in Safari, so we'll ignore the exception.
						}
					} else {
						throw e;
					}
				}
			};

			// For Internet Explorer
			History.intervalList.push(setInterval(History.onUnload,History.options.storeInterval));

			// For Other Browsers
			History.Adapter.bind(window,'beforeunload',History.onUnload);
			History.Adapter.bind(window,'unload',History.onUnload);

			// Both are enabled for consistency
		}

		// Non-Native pushState Implementation
		if ( !History.emulated.pushState ) {
			// Be aware, the following is only for native pushState implementations
			// If you are wanting to include something for all browsers
			// Then include it above this if block

			/**
			 * Setup Safari Fix
			 */
			if ( History.bugs.safariPoll ) {
				History.intervalList.push(setInterval(History.safariStatePoll, History.options.safariPollInterval));
			}

			/**
			 * Ensure Cross Browser Compatibility
			 */
			if ( navigator.vendor === 'Apple Computer, Inc.' || (navigator.appCodeName||'') === 'Mozilla' ) {
				/**
				 * Fix Safari HashChange Issue
				 */

				// Setup Alias
				History.Adapter.bind(window,'hashchange',function(){
					History.Adapter.trigger(window,'popstate');
				});

				// Initialise Alias
				if ( History.getHash() ) {
					History.Adapter.onDomLoad(function(){
						History.Adapter.trigger(window,'hashchange');
					});
				}
			}

		} // !History.emulated.pushState


	}; // History.initCore

	// Try to Initialise History
	if (!History.options || !History.options.delayInit) {
		History.init();
	}

})(window);
;/**
 * 从 jsmod ui 类库中引入分页插件
 * MIT Licensed
 * @author gaochao
 */
(function () {
    var _option;

    _option = {
        currentPage: 0,
        maxShowPage: 10,
        textLabel: ['首页', '上一页', '下一页', '尾页'],
        pageLabel: '{#0}',
        preventInitEvent: false
    };

    /**
     * 分页控件，无需写 html ，提供一个 div 节点自动生成所有的分页所需标签
     * @alias module:jsmod/ui/pagination
     * @constructor
     * @param {(dom|string)}      element                                                          分页控件的容器
     * @param {object}            option                                                           分页控件配置参数
     * @param {int}               option.pageCount                                                 一共有多少页
     * @param {int}               [option.currentPage=0]                                           当前页
     * @param {int}               [option.maxShowPage=10]                                          最多显示分页个数
     * @param {array}             [option.textLabel=new Array('首页', '上一页', '下一页', '尾页')] 几个特殊关键字
     * @param {(string|function)} [option.pageLabel={#0}]                                          字符串用 {#0} 代表当前页, 函数则取返回值作为显示。函数其参数 page 为索引计数（起始0）；而替换字符串为 page + 1
     * @param {bool}              [option.preventInitEvent=false]                                  是否阻止初始化时触发事件
     * @param {bool}              [option.allwaysShow=false]                                       是否总是显示
     * @example
     * var Pagination = require("jsmod/ui/pagination");
     *
     * // 创建实例
     * new Pagination("#page-container", {pageCount: 20});
     */
    var Pagination = function (element, option) {
        var self = this;

        self.element = $(element);
        self.option = $.extend({}, _option, option);

        self.generatePage();
    };

    Pagination.Counst = {};

    Pagination.Counst.PAGE_TPL = '' +
        '<div class="mod-page">' +
            '<% for (var i = 0; i < renderDatas.length; i++) { %>' +
                '<a href="javascript:void(0);" <% if (renderDatas[i].page !== undefined) { %> data-page="<%= renderDatas[i].page %>" <% } %> class="mod-page-item <%= renderDatas[i].className %>"><%= renderDatas[i].label %></a>' +
            '<% } %>' +
        '</div>';

    $.extend(Pagination.prototype, 
    /** @lends module:jsmod/ui/pagination.prototype */
    {
        /**
         * @private
         * @description 生成分页控件、包括html、event
         */
        generatePage: function () {
            var self = this,
                option = self.option,
                renderDatas, html;

            self.generateEvents();

            if (option.pageCount < option.maxShowPage) {
                option.maxShowPage = option.pageCount;
            }

            if (option.preventInitEvent) {
                self.setPage(option.currentPage);
            } else {
                // 异步处理是因为需要获取page对象并绑定事件
                setTimeout(function() {
                    self.setPage(option.currentPage);
                }, 0);
            }
        },
        /**
         * 手动设置当前页
         * @public
         * @param {int} page 当前页
         * @fires module:jsmod/ui/pagination#page
         */
        setPage: function(page) {
            var self = this,
                html, e;

            html = self.getHTML(self.getRenderDatas(page));
            self.element.html(html);
            e = $.Event("page", {page: self.currentPage});

            /**
             * 设置page触发的事件，重复设置相同page会触发多次事件
             * @event module:jsmod/ui/pagination#page
             * @type {object}
             * @property {int} page 当前设定的page值
             */
            $(self).trigger(e, [{page: self.currentPage}]);
        },
        /**
         * 获取当前的 page
         * @public
         */
        getPage: function () {
            return this.currentPage;
        },
        /**
         * @private
         * @description 生成事件
         */
        generateEvents: function() {
            var self = this,
                element = self.element,
                option = self.option;

            element.undelegate("click.page");
            element.delegate("[data-page]:not(.mod-page-item-disabled)", "click.page", function(e) {
                var page = $(this).data("page");

                if ($.isNumeric(page)) {
                    self.setPage(page);
                } else if (page == "+") {
                    self.setPage(self.currentPage + 1);
                } else if (page == "-") {
                    self.setPage(self.currentPage - 1);
                }

                return false;
            });
        },
        /**
         * 哎。。之前写错字母没办法了只能留着了
         * @private
         */
        destory: function () {
            this.element.undelegate("click.page");
            this.element.html("");
        },
        /**
         * 清空分页容器，移除事件
         * @public
         */
        destroy: function () {
            this.destory();
        },
        /**
         * @private
         * @description 获取HTML代码
         * @param {array} renderDatas 渲染分页的数据
         */
        getHTML: function (renderDatas) {
            var html;

            html = cdtable.template(Pagination.Counst.PAGE_TPL, {renderDatas: renderDatas});
            return html;
        },
        /**
         * @private
         * @description 获取分页渲染数据
         * @param {int} page 标示当前页
         * @return {array} renderDatas 渲染分页的数据
         */
        getRenderDatas: function (page) {
            var self = this,
                option = self.option,
                renderDatas = [],
                start, end, offsetEnd, offsetStart;

            page = parseInt(page);
            page = page < 0 ? 0 : page;
            page = page > option.pageCount - 1 ? option.pageCount - 1 : page;

            flag = parseInt(option.maxShowPage / 3); // 分页渲染当前页的标识位

            start = page - flag < 0 ? 0 : page - flag; // start 位置
            offsetEnd = page - flag < 0 ? Math.abs(page - flag) : 0; // end 的偏移

            end = page + (option.maxShowPage - flag) - 1 > option.pageCount - 1 ? option.pageCount - 1 : page + (option.maxShowPage - flag) -1; // end 位置
            offsetStart = page + (option.maxShowPage - flag) - 1 > option.pageCount - 1 ? Math.abs(page + (option.maxShowPage - flag) - 1 - (option.pageCount - 1)) : 0 // start 的偏移

            start -= offsetStart;
            end += offsetEnd;

            if (page != 0 || option.allwaysShow) {
                // 处理固定的前两个数据
                $.each(option.textLabel.slice(0, 2), function(i, label) {
                    if (i == 0 && label) {
                        renderDatas.push({
                            className: (page == 0) ? 'mod-page-item-first mod-page-item-disabled' : "mod-page-item-first",
                            label: label,
                            page: 0
                        });
                    }
                    if (i == 1 && label) {
                        renderDatas.push({
                            className: (page == 0) ? "mod-page-item-prev mod-page-item-disabled" : "mod-page-item-prev",
                            label: label,
                            page: "-"
                        });
                    }
                });   
            }

            // 处理页面信息
            for (start; start <= end; start++) {
                renderDatas.push({
                    className: start == page ? "mod-page-item-active" : "",
                    label: $.isFunction(option.pageLabel) ? option.pageLabel(start) : option.pageLabel.replace(/{#0}/g, start + 1),
                    page: start
                });
            }

            if (page != option.pageCount - 1 || option.allwaysShow) {
                // 处理固定的后两个数据
                $.each(option.textLabel.slice(2, 4), function(i, label) {
                    if (i == 0 && label) {
                        renderDatas.push({
                            className: (page == option.pageCount - 1) ? 'mod-page-item-next mod-page-item-disabled' : "mod-page-item-next",
                            label: label,
                            page: "+"
                        });
                    }
                    if (i == 1 && label) {
                        renderDatas.push({
                            className: (page == option.pageCount - 1) ? 'mod-page-item-last mod-page-item-disabled' : "mod-page-item-last",
                            label: label,
                            page: option.pageCount - 1
                        });
                    }
                });
            }

            // 设置当前页码
            self.currentPage = page;

            return renderDatas;
        }
    });

    window.cdtable.tools.Pagination = Pagination;
})();;(function () {
  var getParamStr = function(url) {
      if (!url) {
          return;
      }
      var urlParts = url.split("?");
      var pathname = urlParts[0];
      var urlParamString = url.substring(pathname.length + 1, url.length);
      return urlParamString;
  }
  var getParams = function(url) {
      var params = [];
      var urlParamString = getParamStr(url);
      if (!urlParamString) {
          return params;
      }
      params = urlParamString.split("&");
      return params;
  }
  var getParamMap = function(url) {
      var map = {};
      var params = getParams(url);
      $.each(params, function(index, val) {
          var kvs = val.split("=");
          var paramName = kvs[0];
          var value = val.substring(paramName.length + 1, val.length);
          map[paramName] = value;
      });
      return map;
  }

  var getParam = function(url, key) {
      var map = getParamMap(url);
      return map[key];
  }

  var addParam = function(url, paramStr) {
      if (getParamStr(url)) {
          url = url + "&" + paramStr;
      } else {
          url = url + "?" + paramStr;
      }
      return url;
  }

  window.cdtable.tools.url = {
      getParamMap: getParamMap,
      addParam: addParam,
      getParam: getParam
  }
})()
;;(function () { 
  var TPL_DATE  = '<div class="cdtable-date-container">' +
    '<input class="cdtable-date-start" name="cdtable-date-start" readonly placeholder="<%= placeholderStart %>" /> - ' +
    '<input class="cdtable-date-end" name="cdtable-date-end" readonly placeholder="<%= placeholderEnd %>" />' +
    '<a href="javascript:void(0);" class="cdtable-date-action"><%= btnRange %></a>' +
    '<a href="javascript:void(0);" class="cdtable-date-remove-action"><%= btnRemove %></a>' +
  '</div>'; 

  var _option = {
    btnRange: '最大日期范围',
    btnRemove: '清空',
    placeholderStart: '起始日期',
    placeholderEnd: '结束日期',
    startMin: '2015/12/01'
  }

  /**
   * DatePicker addon 插件依赖日历控件，依赖 datetimepicker
   * @param {object} option 日历相关参数
   * @param {string} option.container        日历功能的 container 
   * @param {object} option.start            默认查询开始日期
   * @param {object} option.end              默认查询结束日期
   * @param {string} option.startMin         开始日期的最小值
   * @param {bool}   option.showRangeBtn     是否显示 rangebtn 
   * @param {string} option.placeholderStart 开始 input placeholder 
   * @param {string} option.placeholderEnd   结束 input placeholder
   * @param {string} option.btnRange         rangebtn 文案
   * @param {string} option.btnRemove        removeBtn 文案
   */
  var DatePicker = function (option) {
    this.option = $.extend({}, _option, option);
  }

  $.extend(DatePicker.prototype, {
    _addonName: 'datePicker',

    getName: function () {
      return this._addonName;
    },

    /**
     * 获取存放 filter 的 container
     */
    _getContainer: function () {
      return this.option.container ? $(this.option.container) : this.root.$topPluginContainer;
    },

    /**
     * filter 的 view 渲染
     */
    initView: function () {
      var self = this;
      var $container = self._getContainer();
      $container.append($(self._getHTML()));

      this.$start = $container.find('.cdtable-date-start');
      this.$end = $container.find('.cdtable-date-end');

      this._initDatePlugin();
      this._initEvent();
    },

    /**
     * 初始化日期控件
     */
    _initDatePlugin: function () {
      var self = this;

      if (self.option.start && self.option.end) {
        self._registerDateTimePicker();
      }
    },

    _registerDateTimePicker: function (e) {
      var self = this;

      // 初始化过后不再初始化
      if (self._registedPicker) {
        return;
      }

      $.datetimepicker.setLocale('zh');

      self.$start.datetimepicker({
        minDate: self.option.startMin,
        maxDate: new Date(+new Date() - 86400000), 
        format: 'Y-m-d',
        defaultDate: new Date(+new Date() - 86400000),
        timepicker: false,
        onSelectDate: function(dp, $input) {
          if (!self.$end.val()) {
            self.$end.datetimepicker({
              value: new Date(dp.getTime() + 86400000)
            });
          }
          self._triggerChange();
        }
      });

      self.$end.datetimepicker({
        minDate: self.option.startMin,
        maxDate: new Date(),
        format: 'Y-m-d',
        defaultDate: new Date(),
        timepicker: false,
        onSelectDate: function(dp, $input) {
          if (!self.$start.val()) {
            self.$start.datetimepicker({
              value: new Date(dp.getTime() - 86400000)
            });
          }

          self._triggerChange();
        }
      });

      self._registedPicker = true;

      // 如果由点击事件创建则默认打开
      // 且进行数据的重新加载
      if (e) {
        $(e.target).datetimepicker('show');
      }
    },

    /**
     * 注册事件
     */
    _initEvent: function () {
      var self = this;

      self._getContainer().delegate('.cdtable-date-start, .cdtable-date-end', 'click', function (e) {
        self._registerDateTimePicker(e);
      });

      self._getContainer().delegate('.cdtable-date-remove-action.enable', 'click', function (e) {
        self.reset();
        self._triggerChange();
        self._getContainer().find('.cdtable-date-remove-action').removeClass('enable');
      });

      self._getContainer().delegate('.cdtable-date-action', 'click', function () {
        self.$start.datetimepicker({
          value: new Date(self.option.startMin),
          format: 'Y-m-d'
        });

        self.$end.datetimepicker({
          value: new Date(),
          format: 'Y-m-d'
        });

        self._triggerChange();
      });
    },

    _triggerChange: function () {
      this._getContainer().find('.cdtable-date-remove-action').addClass('enable');
      this.root.$el.trigger('cdtable.datepicker.change');
      this.root.$el.trigger('cdtable.reflow');
    },

    /**
     * 重置 search addon
     */
    reset: function () {
      this.$start.val("").datetimepicker('destroy');
      this.$end.val("").datetimepicker('destroy');
      this._registedPicker = false;
    },

    /**
     * 渲染 search html 数据
     */
    _getHTML: function () {
      return window.cdtable.template(TPL_DATE , this.option);
    },

    /**
     * 设置 addon 的 root 对象
     */
    setRoot: function (root) {
      this.root = root;
    },

    /**
     * 获取 addon 提供的 url 数据
     */
    getAddonData: function () {
      return {
        start: this.$start.val(),
        end: this.$end.val()
      };
    }
  });

  window.cdtable.addons.DatePicker = DatePicker;
})();;(function () {
  var TPL_FILTER = '<div class="cdtable-filter-container">' +
    '<ul>' +
      '<% for (var i = 0; i < filters.length; i++) { %>' +
        '<li>' +
          '<span class="cdtable-filter-select-name"><%= filters[i].label %></span>' +
          '<select name=\'<%= filters[i].name %>\'>' +
            '<% for (var j = 0; j < filters[i].datas.length; j++) { %>' +
              '<option <% if (j == filters[i].activeIndex) { %>selected="selected"<% } %>  data-idx="<%= j %>" value=\'<%= filters[i].datas[j].value %>\'><%= filters[i].datas[j].name %></option>' +
            '<% } %>' +
          '</select>' +
        '</li>' +
      '<% } %>' +
    '</ul>' +
  '</div>';

  var TPL_FILTER_LINE = '<div class="cdtable-filter-container cdtable-filter-container-line">' +
      '<ul>' +
        '<% for (var i = 0; i < filters.length; i++) { %>' +
          '<li <% if (filters[i].className) { %>class="<%= filters[i].className %>" <% } %> >' +
            '<% if (filters[i].label) { %>' +
              '<div class="cdtable-filter-select-name"><%= filters[i].label %></div>' +
            '<% } %>' +
            '<ul class="cdtable-filter-raw-list">' +
              '<% for (var j = 0; j < filters[i].datas.length; j++) { %>' +
                '<li data-name="<%= filters[i].name %>" class="cdtable-filter-raw-item <% if (j == filters[i].activeIndex) { %>cdtable-filter-raw-item-active<% } %>" data-value="<%= filters[i].datas[j].value %>">' +
                  '<a href="javascript:void(0)"><%= filters[i].datas[j].name %></a>' +
                '</li>' +
              '<% } %>' +
            '</ul>' +
          '</li>' +
        '<% } %>' +
      '</ul>' +
    '</div>';

  /**
   * @param {object}   option 筛选相关的配置参数
   * @param {string}   option.container 筛选功能的 container
   * @param {bool}     option.line 是否使用一行一行的方式展现筛选项目
   * @param {[filterItem]} option.filters 筛选相关配置数组
   * eg. [{
   *   name: 'usertype',
   *   datas: [
   *     { name: '不限', value: '0' },
   *     { name: '僵尸用户', value: '1' },
   *     { name: '黄金用户', value: '2' }
   *   ]
   * }]
   */
  var Filter = function (option) {
    this.option = option;
  }

  $.extend(Filter.prototype, {
    _addonName: 'filter',

    getName: function () {
      return this._addonName;
    },

    /**
     * 获取存放 filter 的 container
     */
    _getContainer: function () {
      return this.option.container ? $(this.option.container) : this.root.$topPluginContainer;
    },

    /**
     * filter 的 view 渲染
     */
    initView: function () {
      var self = this;
      var $container = self._getContainer();
      $container.append($(self._getHTML()));

      this._initEvent();
    },

    _setHash: function (key, value) {
      var self = this;

      // 找到 filter
      var filter = self.option.filters.filter(function (item) {
        return key == item.name
      })[0];

      if (filter) {
        self.root.setHistory(filter.historyKey || filter.name, value);
      }
    },

    /**
     * 注册事件
     */
    _initEvent: function () {
      var self = this;

      // 发生改变立即进行重新请求
      if (self.option.line) {
        self._getContainer().delegate('.cdtable-filter-raw-item', 'click', function (e, preventSet) {
          $(this).addClass('cdtable-filter-raw-item-active')
            .siblings().removeClass('cdtable-filter-raw-item-active');

          self.root.$el.trigger('cdtable.filter.change');
          self.root.$el.trigger('cdtable.reflow');

          // 设置 filter 的 hash
          if (self.option.historyEnable && !preventSet) {
            var key = $(this).attr('data-name');
            var value = $(this).attr('data-value');

            self._setHash(key, value);
          }
        });

        self.root.$el.on('cdtable.search.change', function () {
          self.reset();
        });
      } else {
        self._getContainer().delegate('select', 'change', function (e, preventSet) {
          self.root.$el.trigger('cdtable.filter.change');
          self.root.$el.trigger('cdtable.reflow');

          // 设置 filter 的 hash
          if (self.option.historyEnable && !preventSet) {
            var key = $(this).prop('name');
            var value = $(this).val();

            self._setHash(key, value);
          }
        });

        self.root.$el.on('cdtable.search.change', function () {
          self.reset();
        });
      }
    },

    /**
     * 处理 filter 数据
     */
    _dealFilterData: function (filters) {
      var self = this,
        option = self.option;

      filters.forEach(function (item) {
        // 最先控制本身的 activeIndex
        if (item.activeIndex !== undefined) {
          return;
        }

        // 开启 history 模式
        if (self.option.historyEnable) {
          var historyKey = item.historyKey || item.name;
          var historyValue = self.root.getHistoryValue(historyKey);

          if (historyValue) {
            item.datas.forEach(function (data, idx) {
              if (historyValue == data.value) {
                item.activeIndex = idx;
              }
            });
          }
        }

        // 总有 index
        item.activeIndex = item.activeIndex || 0;
      });
    },

    /**
     * 渲染 select html 数据
     */
    _getHTML: function () {
      var filters = this.option.filters;
      var self = this;

      self._dealFilterData(filters);

      if (self.option.line) {
        return window.cdtable.template(TPL_FILTER_LINE, {filters: filters});
      } else {
        return window.cdtable.template(TPL_FILTER, {filters: filters});
      }
    },

    /**
     * 设置 addon 的 root 对象
     */
    setRoot : function (root) {
      var self = this;

      self.root = root;

      // 如果可以改变 hash
      if (self.option.historyEnable) {
        self.root.$el.on('cdtable.hashchange', function (e, hashData) {
          var currentData = self.getAddonData(true);

          for (var key in currentData) {
            // 找到 filter
            var filter = self.option.filters.filter(function (item) {
              return key == item.name
            })[0];

            // 没有 filter 就继续
            if (!filter) {
              continue;
            }
            // debugger;
            // 找到 history key
            var historyKey = filter.historyKey || filter.name;

            // 判定是否相等
            // 如果不相等需要改变 当前显示，并派发请求
            if (hashData[historyKey] != currentData[key]) {
              if (self.option.line) {
                var value = hashData[historyKey] || filter.datas[filter.activeIndex].value;

                var $li = self._getContainer().find('.cdtable-filter-raw-item[data-name="' + key + '"][data-value="' + value + '"]');

                if ($li.length) {
                  $li.trigger('click', [true]);
                }
              } else {
                var value = hashData[historyKey] || filter.datas[filter.activeIndex].value;

                var $option = self._getContainer().find('select[name="' + key + '"] option[value="' + value + '"]');

                if ($option.length) {
                  self._getContainer().find('select[name="' + key + '"]').prop('selectedIndex', $option.data('idx'))
                    .trigger('change', [true]);
                }
              }
            }
          }

        });
      }
    },

    /**
     * 重置 filter 所有的 select
     */
    reset: function () {
      this._getContainer().find('select').each(function () {
        $(this).prop('selectedIndex', 0);
      });
    },

    /**
     * 获取 addon 提供的 url 数据
     * 当传入 notSetHash 时不进行 HASH 的改变
     */
    getAddonData: function (notSetHash) {
      var data = {};
      var self = this;
      var filters = self.option.filters;

      if (self.option.line) {
        this._getContainer().find('.cdtable-filter-raw-item-active').each(function () {
          data[$(this).attr('data-name')] = $(this).attr('data-value');
        });
      } else {
        this._getContainer().find('select').each(function () {
          data[$(this).prop('name')] = $(this).val();
        });
      }

      return data;
    }
  });

  window.cdtable.addons.Filter = Filter;
})();
;(function () {
  var TPL_PA = '<div class="cdtable-pagination-container"></div>';

  /**
   * @param {object}   option            翻页相关配置参数
   * @param {bool}     option.container  翻页功能的 container
   * @param {function} option.getSetting 返回总页数，当前页数，每页显示个数信息
   * eg. function (json) {
   *   return {
   *     total: json.total_page_number,
   *     current: json.current_page_number,
   *     count: json.per_page_counts
   *   }
   * }
   */
  var Pagination = function (option) {
    this.option = option;

  }

  $.extend(Pagination.prototype, {
    _addonName: 'pagination',

    getName: function () {
      return this._addonName;
    },

    /**
     * 获取存放 addons 的 container
     */
    _getContainer: function () {
      return this.option.container ? $(this.option.container) : this.root.$bottomPluginContainer;
    },

    /**
     * addons 的 view 渲染
     */
    initView: function () {
      var self = this;

      self._getContainer().html(TPL_PA);
      self._initEvent();

      // 在完成回调时执行真正的 initView
      self.root.$el.on('cdtable.endloading', function (e) {
        self._initView(e.json);
      });
    },

    /**
     * 真正初始化分页控件的位置
     */
    _initView: function (json) {
      var self = this,
        setting = self.option.getSetting(json),
        $container = self._getContainer();

      if (!self._pageInstance && setting) {
        self._pageInstance = new window.cdtable.tools.Pagination($container.find('.cdtable-pagination-container'), {
          pageCount: setting.total,
          allwaysShow: true,
          maxShowPage: 3,
          preventInitEvent: true
        });

        $(self._pageInstance).on('page', function () {
          self.root.$el.trigger('cdtable.reflow');
        });
      }
    },

    /**
     * 注册事件
     */
    _initEvent: function () {
      var self = this;

      // filter 插件改变时需要重置分页
      self.root.$el.on('cdtable.filter.change cdtable.search.change cdtable.datepicker.change cdtable.rank.change', function () {
        self.reset();
      });
    },

    /**
     * 重置 page 控件
     */
    reset: function () {
      this._pageInstance && this._pageInstance.destory();
      this._pageInstance = null;
    },

    /**
     * 渲染 select html 数据
     */
    _getHTML: function () {
      var filters = this.option.filters;

      return window.cdtable.template(TPL_FILTER, {filters: filters});
    },

    /**
     * 设置 addon 的 root 对象
     */
    setRoot : function (root) {
      this.root = root;
    },

    /**
     * 获取 addon 提供的 url 数据
     */
    getAddonData: function () {
      var page = this._pageInstance ? this._pageInstance.getPage() : 0;

      return page;
    }
  });

  window.cdtable.addons.Pagination = Pagination;
})();
;(function () { 
  var TPL_FILTER = '<div class="cdtable-rank-container">' +
    '<ul>' +
      '<% for (var i = 0; i < datas.length; i++) { %>' +
        '<li class="cdtable-rank-item" data-rank-key="<%= datas[i].key %>">' +
          '<span><%= datas[i].name %></span>' +
        '</li>' +
      '<% } %>' +
    '</ul>' +
  '</div>'; 

  /**
   * rank addons provides a way to rank the table's results
   * you can define UI by yourself, or use built in dom structure
   * 
   * @param {object}   option rank      addon option
   * @param {string}   option.container the container of addon 
   * @param {[object]} option.datas     the datas of rank, it must be with the right format 
   * eg. [{
   *   key: 'default',                  // the key of a item
   *   name: 'defaul'                   // the display name of a item
   },{
   *   key: 'time',
   *   name: 'time sorting',                  
   *   types: [                          // type is meant to provide different way of sorting
   *     cdtable.addons.Rank.Const.ASC,  // from low to high
   *     cdtable.addons.Rank.Const.DESC // from high to low
   *   ]
   * }] 
   */
  var Rank = function (option) {
    this.option = option;

  }

  Rank.Const = {
    ASC: 'asc',
    DESC: 'desc'
  }

  $.extend(Rank.prototype, {
    _addonName: 'rank',

    getName: function () {
      return this._addonName;
    },

    /**
     * get the container of addon
     */
    _getContainer: function () {
      return this.option.container ? $(this.option.container) : this.root.$topPluginContainer;
    },

    /**
     * render addon's view
     */
    initView: function () {
      var self = this;
      var $container = self._getContainer();
      $container.append($(self._getHTML()));

      this._initEvent();
    },

    /**
     * registe event
     */
    _initEvent: function () {
      var self = this;

      self._getContainer().delegate('.cdtable-rank-item', 'click', function () {
        self._dealItem($(this));
      });
    },

    /**
     * deal click event for a sorting item
     */
    _dealItem: function ($item) {
      var self = this, 
        key = $item.data('rank-key');

      var dataItem = self._findDataItem(key);

      if (!dataItem) {
        return;
      }

      if (self.$activeItems && (self.$activeItems.get(0) != $item.get(0))) {
        self._resetItem(self.$activeItems);
      }

      self.$activeItems = $item.addClass('cdtable-rank-item-active');

      // no type, it direct trigger event
      if (!dataItem.types) {
        return self._triggerChange();
      }

      var currentType = $item.data('rank-type');
      var index = dataItem.types.indexOf(currentType);
      var nextIndex, nextType;

      // get nextIndex, nextType
      if (index == -1) {
        nextIndex = 0;
      } else {
        nextIndex = index + 1 == dataItem.types.length ? 0 : index + 1;
      }
      var nextType = dataItem.types[nextIndex];

      // remove current type class, add next class 
      currentType && $item.removeClass('cdtable-rank-type-' + currentType);
      $item.addClass('cdtable-rank-type-' + nextType).data('rank-type', nextType);

      // user defined callback to update UI
      self.option.onChange && self.option.onChange({
        target: $item,
        type: nextType
      });

      self._triggerChange();
    },

    /**
     * reset a rank dom, when current rank dom is not equal to the last 
     */
    _resetItem: function ($lastDom) {
      $lastDom.removeClass('cdtable-rank-item-active');
      $lastDom.removeClass('cdtable-rank-type-' + $lastDom.data('rank-type'));
      $lastDom.data('rank-type', undefined);
    },

    /**
     * trigger rank change event
     */
    _triggerChange: function () {
      this.root.$el.trigger('cdtable.rank.change');
      this.root.$el.trigger('cdtable.reflow');
    },

    /**
     * find user defined data item
     */
    _findDataItem: function (key) {
      var filterTypes = this.option.datas.filter(function (item) {
        return item.key == key;
      });

      return filterTypes[0];
    },

    /**
     * get addon HTML
     */
    _getHTML: function () {
      var datas = this.option.datas;

      return window.cdtable.template(TPL_FILTER, {datas: datas});
    },

    /**
     * 设置 addon 的 root 对象
     */
    setRoot : function (root) {
      this.root = root;
    },

    /**
     * 重置 filter 所有的 select
     */
    reset: function () {
      this._getContainer().find('select').each(function () {
        $(this).prop('selectedIndex', 0);
      });
    },

    /**
     * 获取 addon 提供的 url 数据
     */
    getAddonData: function () {
      var self = this,
        $item = self._getContainer().find('.cdtable-rank-item-active'),
        data;

      if ($item.length > 0) {
        data = {
          key: $item.data('rank-key'),
          type: $item.data('rank-type')
        }
      }

      return data;
    }
  });

  window.cdtable.addons.Rank = Rank;
})();;(function () { 
  var TPL_SEARCH = '<div class="cdtable-search-container">' +
    '<input class="cdtable-search-input" value="<%= val %>" placeholder="<%= placeholder %>" />' +
    '<a href="javascript:void(0);" class="cdtable-search-action"><%= btnText %></a>' +
    '<p class="cdtable-search-error"></p>' +
  '</div>';

  var _option = {
    btnText: '搜索',
    val: '',
    placeholder: ''
  }

  /**
   * search addon ， 模块提供依照输入内容进行查询功能
   * @param {object} option 筛选相关的配置参数
   * @param {string} option.container 筛选功能的 container 
   * @param {string} option.placeholder   input 上 placeholder 的文案
   * @param {string} option.val           input 默认 value
   * @param {string} [option.btnText=搜索] btn 的文案
   */
  var Search = function (option) {
    this.option = $.extend({}, _option, option);
  }

  $.extend(Search.prototype, {
    _addonName: 'search',

    getName: function () {
      return this._addonName;
    },

    /**
     * 获取存放 filter 的 container
     */
    _getContainer: function () {
      return this.option.container ? $(this.option.container) : this.root.$topPluginContainer;
    },

    /**
     * filter 的 view 渲染
     */
    initView: function () {
      var self = this;
      var $container = self._getContainer();
      $container.append($(self._getHTML()));

      this.$input = $container.find('.cdtable-search-input');
      this.$error = $container.find('.cdtable-search-error').hide();

      this._initEvent();
    },

    /**
     * 注册事件
     */
    _initEvent: function () {
      var self = this;

      // 检索点击
      self._getContainer().delegate('.cdtable-search-action', 'click', function () {
        self.root.$el.trigger('cdtable.search.change');
        self.root.$el.trigger('cdtable.reflow');
      });

      self._getContainer().delegate('.cdtable-search-input', 'keydown', function (e) {
        if (e.keyCode == 13) {
          self.root.$el.trigger('cdtable.search.change');
          self.root.$el.trigger('cdtable.reflow');
        }
      });
    },

    /**
     * 重置 search addon
     */
    reset: function () {
      this.$input.val("");
    },

    /**
     * 渲染 search html 数据
     */
    _getHTML: function () {
      return window.cdtable.template(TPL_SEARCH, this.option);
    },

    /**
     * 设置 addon 的 root 对象
     */
    setRoot : function (root) {
      this.root = root;
    },

    /**
     * 获取 addon 提供的 url 数据
     */
    getAddonData: function () {
      return this.$input.val();
    }
  });

  window.cdtable.addons.Search = Search;
})();