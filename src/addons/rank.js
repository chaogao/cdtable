(function () { 
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
})();