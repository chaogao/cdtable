(function () { 
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
})();