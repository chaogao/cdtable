(function () { 
  var TPL_FILTER = '<div class="cdtable-filter-container">' +
    '<ul>' +
      '<% for (var i = 0; i < filters.length; i++) { %>' +
        '<li>' +
          '<span class="cdtable-filter-select-name"><%= filters[i].label %></span>' +
          '<select name=\'<%= filters[i].name %>\'>' +
            '<% for (var j = 0; j < filters[i].datas.length; j++) { %>' +
              '<option value=\'<%= filters[i].datas[j].value %>\'><%= filters[i].datas[j].name %></option>' +
            '<% } %>' +
          '</select>' +
        '</li>' +
      '<% } %>' +
    '</ul>' +
  '</div>'; 

  var TPL_FILTER_LINE = '<div class="cdtable-filter-container cdtable-filter-container-line">' +
      '<ul>' +
        '<% for (var i = 0; i < filters.length; i++) { %>' +
          '<li>' +
            '<% if (filters[i].label) { %>' +
              '<div class="cdtable-filter-select-name"><%= filters[i].label %></div>' +
            '<% } %>' +
            '<ul class="cdtable-filter-raw-list">' +
              '<% for (var j = 0; j < filters[i].datas.length; j++) { %>' +
                '<li data-name="<%= filters[i].name %>" class="cdtable-filter-raw-item <% if (j == 0) { %>cdtable-filter-raw-item-active<% } %>" data-value="<%= filters[i].datas[j].value %>">' +
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

    /**
     * 注册事件
     */
    _initEvent: function () {
      var self = this;

      // 发生改变立即进行重新请求
      if (self.option.line) {
        self._getContainer().delegate('.cdtable-filter-raw-item', 'click', function () {
          $(this).addClass('cdtable-filter-raw-item-active')
            .siblings().removeClass('cdtable-filter-raw-item-active');

          self.root.$el.trigger('cdtable.filter.change');
          self.root.$el.trigger('cdtable.reflow');
        });

        self.root.$el.on('cdtable.search.change', function () {
          self.reset();
        });
      } else {
        self._getContainer().delegate('select', 'change', function () {
          self.root.$el.trigger('cdtable.filter.change');
          self.root.$el.trigger('cdtable.reflow');
        });

        self.root.$el.on('cdtable.search.change', function () {
          self.reset();
        });
      }
    },

    /**
     * 渲染 select html 数据
     */
    _getHTML: function () {
      var filters = this.option.filters;
      var self = this;

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
      var data = {};
      var self = this;

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