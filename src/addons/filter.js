(function () {
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

          self.root.$el.trigger('cdtable.filter.change', [preventSet]);
          self.root.$el.trigger('cdtable.reflow');

          // 设置 filter 的 hash
          if (self.option.historyEnable && !preventSet) {
            var key = $(this).attr('data-name');
            var value = $(this).attr('data-value');

            self._setHash(key, value, true);
          }
        });

        self.root.$el.on('cdtable.search.change', function () {
          self.reset();
        });
      } else {
        self._getContainer().delegate('select', 'change', function (e, preventSet) {
          self.root.$el.trigger('cdtable.filter.change', [preventSet]);
          self.root.$el.trigger('cdtable.reflow');

          // 设置 filter 的 hash
          if (self.option.historyEnable && !preventSet) {
            var key = $(this).prop('name');
            var value = $(this).val();

            self._setHash(key, value, true);
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
            var hashValue = hashData[historyKey] || filter.datas[filter.activeIndex].value;

            if (hashValue != currentData[key]) {
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
