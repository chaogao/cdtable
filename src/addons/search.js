(function () { 
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