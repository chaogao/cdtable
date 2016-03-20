(function () {
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