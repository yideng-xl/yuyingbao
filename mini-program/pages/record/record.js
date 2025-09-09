const app = getApp();

Page({
  data: {
    currentFilter: 'all',
    selectedDate: '',
    allRecords: [], // 存储所有原始记录
    filteredRecords: [], // 存储筛选后的记录
    showEditModal: false,
    editingRecord: {},
    
    // 选项数据
    solidTypes: ['米糊', '蔬菜泥', '水果泥', '肉泥', '蛋黄', '其他'],
    diaperTextures: ['稀', '软', '成形', '干硬'],
    diaperColors: ['黄', '绿', '黑', '棕']
  },

  onLoad() {
    this.setData({
      selectedDate: this.formatDate(new Date())
    });
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords() {
    const familyId = app.globalData.familyInfo?.id;
    if (!familyId) {
      this.setData({ 
        allRecords: [],
        filteredRecords: [] 
      });
      return;
    }
    
    app.get(`/families/${familyId}/records`)
      .then(list => {
        console.log('Records from backend:', list);
        
        // 确保 list 是数组并且有数据
        if (!Array.isArray(list)) {
          console.warn('Backend returned non-array data:', list);
          this.setData({ 
            allRecords: [],
            filteredRecords: [] 
          });
          return;
        }
        
        // 格式化记录并按时间降序排序
        const formattedRecords = list
          .map(record => this.formatRecordForDisplay(record))
          .filter(record => record !== null) // 过滤掉无效记录
          .sort((a, b) => {
            // 按 happenedAt 时间降序排序（最新的在前）
            if (!a.happenedAt || !b.happenedAt) return 0;
            return new Date(b.happenedAt) - new Date(a.happenedAt);
          });
        
        console.log('Formatted and sorted records:', formattedRecords);
        
        // 设置所有记录并应用筛选
        this.setData({ 
          allRecords: formattedRecords
        }, () => {
          // 在数据设置完成后再应用筛选
          this.applyFilter();
        });
      })
      .catch((error) => {
        console.error('Load Records Error:', error);
        wx.showToast({ title: '加载记录失败', icon: 'none' });
        this.setData({ 
          allRecords: [],
          filteredRecords: [] 
        });
      });
  },

  formatRecordForDisplay(record) {
    console.log('Formatting record for display:', record);
    
    // 验证记录对象
    if (!record || typeof record !== 'object') {
      console.error('Invalid record object:', record);
      return null;
    }
    
    const icons = {
      'BREASTFEEDING': '🤱',
      'BOTTLE': '🍼',
      'FORMULA': '🥛',
      'SOLID': '🥣',
      'DIAPER': '💩',
      'GROWTH': '📏'
    };
    
    const titles = {
      'BREASTFEEDING': '母乳亲喂',
      'BOTTLE': '瓶喂',
      'FORMULA': '配方奶',
      'SOLID': '辅食',
      'DIAPER': '大便',
      'GROWTH': '成长记录'
    };
    
    let details = [];
    if (record.type === 'BREASTFEEDING') {
      details = [
        { label: '时长', value: `${record.durationMin || 0}分钟` },
        { label: '乳房', value: record.breastfeedingSide === 'LEFT' ? '左侧' : (record.breastfeedingSide === 'RIGHT' ? '右侧' : '未知') }
      ];
    } else if (record.type === 'BOTTLE' || record.type === 'FORMULA') {
      details = [
        { label: '喂奶量', value: `${record.amountMl || 0}ml` }
      ];
    } else if (record.type === 'SOLID') {
      const solidTypeMap = {
        'RICE_CEREAL': '米糊',
        'VEGETABLE_PUREE': '蔬菜泥',
        'FRUIT_PUREE': '水果泥',
        'MEAT_PUREE': '肉泥',
        'EGG_YOLK': '蛋黄',
        'OTHER': '其他'
      };
      details = [
        { label: '类型', value: solidTypeMap[record.solidType] || record.solidType || '辅食' },
        { label: '备注', value: record.note || '--' }
      ];
    } else if (record.type === 'DIAPER') {
      const textureMap = { 'WATERY': '稀', 'SOFT': '软', 'NORMAL': '成形', 'HARD': '干硬' };
      const colorMap = { 'YELLOW': '黄', 'GREEN': '绿', 'BROWN': '棕', 'BLACK': '黑', 'RED': '红', 'WHITE': '白' };
      const texture = textureMap[record.diaperTexture] || record.diaperTexture || '未知';
      const color = colorMap[record.diaperColor] || record.diaperColor || '未知';
      details = [
        { label: '性状', value: texture },
        { label: '颜色', value: color }
      ];
      if (record.note) {
        details.push({ label: '备注', value: record.note });
      }
    } else if (record.type === 'GROWTH') {
      details = [
        { label: '身高', value: `${record.heightCm || 0}cm` },
        { label: '体重', value: `${record.weightKg || 0}kg` }
      ];
    }
    
    // 格式化时间
    let timeStr = '--:--';
    let dateStr = '--';
    if (record.happenedAt) {
      try {
        const dateObj = new Date(record.happenedAt);
        if (!isNaN(dateObj.getTime())) {
          timeStr = this.formatTime(dateObj);
          dateStr = this.formatDate(dateObj);
        }
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }
    
    const result = {
      id: record.id,
      type: record.type,
      icon: icons[record.type] || '📝',
      title: titles[record.type] || '记录',
      time: timeStr,
      date: dateStr,
      details,
      happenedAt: record.happenedAt, // 保留原始时间用于排序和筛选
      ...record // 保留原始数据用于编辑
    };
    
    console.log('Formatted record result:', result);
    return result;
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      currentFilter: filter
    });
    this.applyFilter();
  },

  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value
    });
    this.applyFilter();
  },

  applyFilter() {
    const { currentFilter, selectedDate, allRecords } = this.data;
    
    console.log('Applying filter:', { currentFilter, selectedDate, recordsCount: allRecords.length });
    
    let filtered = [...(allRecords || [])];
    
    // 按类型筛选
    if (currentFilter !== 'all') {
      if (currentFilter === 'feeding') {
        filtered = filtered.filter(record => {
          const isFeedingType = ['BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID'].includes(record.type);
          console.log(`Record ${record.id} type ${record.type} is feeding:`, isFeedingType);
          return isFeedingType;
        });
      } else {
        // 映射前端类型到后端类型
        const typeMap = {
          'breastfeeding': 'BREASTFEEDING',
          'bottle': 'BOTTLE',
          'formula': 'FORMULA',
          'solid': 'SOLID',
          'diaper': 'DIAPER',
          'growth': 'GROWTH'
        };
        const backendType = typeMap[currentFilter];
        filtered = filtered.filter(record => record.type === backendType);
      }
    }
    
    // 按日期筛选
    if (selectedDate) {
      filtered = filtered.filter(record => {
        if (!record.happenedAt) return false;
        const recordDate = this.formatDate(new Date(record.happenedAt));
        return recordDate === selectedDate;
      });
    }
    
    console.log('Filtered records:', filtered.length, filtered);
    
    this.setData({
      filteredRecords: filtered
    });
  },

  editRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.allRecords.find(r => r.id == id); // 从所有记录中查找
    
    if (record) {
      // 设置选项索引
      if (record.type === 'SOLID') {
        const solidTypeMap = {
          'RICE_CEREAL': '米糊',
          'VEGETABLE_PUREE': '蔬菜泥',
          'FRUIT_PUREE': '水果泥',
          'MEAT_PUREE': '肉泥',
          'EGG_YOLK': '蛋黄',
          'OTHER': '其他'
        };
        const solidTypeName = solidTypeMap[record.solidType] || record.solidType || '其他';
        record.solidTypeIndex = this.data.solidTypes.indexOf(solidTypeName);
        record.solidType = solidTypeName;
        // 辅食记录的note字段包含喂食量信息
        record.solidAmount = record.note || '';
      } else if (record.type === 'DIAPER') {
        const textureMap = { 'WATERY': '稀', 'SOFT': '软', 'NORMAL': '成形', 'HARD': '干硬' };
        const colorMap = { 'YELLOW': '黄', 'GREEN': '绿', 'BROWN': '棕', 'BLACK': '黑', 'RED': '红', 'WHITE': '白' };
        const texture = textureMap[record.diaperTexture] || record.diaperTexture || '成形';
        const color = colorMap[record.diaperColor] || record.diaperColor || '黄';
        record.textureIndex = this.data.diaperTextures.indexOf(texture);
        record.colorIndex = this.data.diaperColors.indexOf(color);
        record.texture = texture;
        record.color = color;
      }
      
      // 设置时间和日期字段用于编辑
      if (record.happenedAt) {
        const date = new Date(record.happenedAt);
        record.startTime = this.formatTime(date);
        record.date = this.formatDate(date);
      }
      
      // 设置其他字段
      if (record.type === 'BREASTFEEDING') {
        record.duration = record.durationMin;
        record.breast = record.breastfeedingSide === 'LEFT' ? 'left' : 'right';
      } else if (record.type === 'BOTTLE' || record.type === 'FORMULA') {
        record.amount = record.amountMl;
      } else if (record.type === 'GROWTH') {
        record.height = record.heightCm;
        record.weight = record.weightKg;
      }
      
      this.setData({
        showEditModal: true,
        editingRecord: { ...record }
      });
    }
  },

  hideEditModal() {
    this.setData({
      showEditModal: false,
      editingRecord: {}
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  // 编辑表单事件处理
  onEditTimeChange(e) {
    this.setData({
      'editingRecord.startTime': e.detail.value
    });
  },

  onEditDateChange(e) {
    this.setData({
      'editingRecord.date': e.detail.value
    });
  },

  onEditDurationChange(e) {
    this.setData({
      'editingRecord.duration': e.detail.value
    });
  },

  onEditAmountChange(e) {
    this.setData({
      'editingRecord.amount': e.detail.value
    });
  },

  onEditSolidTypeChange(e) {
    this.setData({
      'editingRecord.solidTypeIndex': e.detail.value,
      'editingRecord.solidType': this.data.solidTypes[e.detail.value]
    });
  },

  onEditSolidAmountChange(e) {
    this.setData({
      'editingRecord.solidAmount': e.detail.value
    });
  },

  onEditTextureChange(e) {
    this.setData({
      'editingRecord.textureIndex': e.detail.value,
      'editingRecord.texture': this.data.diaperTextures[e.detail.value]
    });
  },

  onEditColorChange(e) {
    this.setData({
      'editingRecord.colorIndex': e.detail.value,
      'editingRecord.color': this.data.diaperColors[e.detail.value]
    });
  },

  onEditNoteChange(e) {
    this.setData({
      'editingRecord.note': e.detail.value
    });
  },

  onEditHeightChange(e) {
    this.setData({
      'editingRecord.height': e.detail.value
    });
  },

  onEditWeightChange(e) {
    this.setData({
      'editingRecord.weight': e.detail.value
    });
  },

  selectEditBreast(e) {
    const breast = e.currentTarget.dataset.breast;
    this.setData({
      'editingRecord.breast': breast
    });
  },

  saveEdit() {
    const { editingRecord } = this.data;
    
    if (!this.validateEditRecord(editingRecord)) {
      return;
    }
    
    const familyId = app.globalData.familyInfo?.id;
    if (!familyId) {
      wx.showToast({ title: '请先创建或加入家庭', icon: 'none' });
      return;
    }

    // 构建更新请求数据
    const payload = {
      type: editingRecord.type
    };

    // 根据记录类型设置字段和时间
    if (editingRecord.type === 'BREASTFEEDING') {
      payload.durationMin = Number(editingRecord.duration) || undefined;
      payload.breastfeedingSide = editingRecord.breast === 'left' ? 'LEFT' : 'RIGHT';
      
      // 使用选择的时间
      if (editingRecord.startTime) {
        const today = new Date();
        const [hours, minutes] = editingRecord.startTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = today.toISOString();
      } else {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date().toISOString();
      }
    } else if (editingRecord.type === 'BOTTLE' || editingRecord.type === 'FORMULA') {
      payload.amountMl = Number(editingRecord.amount) || undefined;
      
      // 使用选择的时间
      if (editingRecord.startTime) {
        const today = new Date();
        const [hours, minutes] = editingRecord.startTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = today.toISOString();
      } else {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date().toISOString();
      }
    } else if (editingRecord.type === 'SOLID') {
      const solidTypeMap = {
        '米糊': 'RICE_CEREAL',
        '蔬菜泥': 'VEGETABLE_PUREE', 
        '水果泥': 'FRUIT_PUREE',
        '肉泥': 'MEAT_PUREE',
        '蛋黄': 'EGG_YOLK',
        '其他': 'OTHER'
      };
      payload.solidType = solidTypeMap[editingRecord.solidType] || 'OTHER';
      payload.note = editingRecord.solidAmount || '';
      
      // 使用选择的时间
      if (editingRecord.startTime) {
        const today = new Date();
        const [hours, minutes] = editingRecord.startTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = today.toISOString();
      } else {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date().toISOString();
      }
    } else if (editingRecord.type === 'DIAPER') {
      const textureMap = { '稀': 'WATERY', '软': 'SOFT', '成形': 'NORMAL', '干硬': 'HARD' };
      const colorMap = { '黄': 'YELLOW', '绿': 'GREEN', '棕': 'BROWN', '黑': 'BLACK' };
      payload.diaperTexture = textureMap[editingRecord.texture] || undefined;
      payload.diaperColor = colorMap[editingRecord.color] || undefined;
      payload.note = editingRecord.note;
      
      // 使用选择的时间
      if (editingRecord.startTime) {
        const today = new Date();
        const [hours, minutes] = editingRecord.startTime.split(':');
        today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = today.toISOString();
      } else {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date().toISOString();
      }
    } else if (editingRecord.type === 'GROWTH') {
      payload.heightCm = Number(editingRecord.height) || undefined;
      payload.weightKg = Number(editingRecord.weight) || undefined;
      // 如果有日期字段，使用它
      if (editingRecord.date) {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date(editingRecord.date).toISOString();
      } else {
        // 使用ISO格式时间以匹配后端期望的格式
        payload.happenedAt = new Date().toISOString();
      }
    }

    // 调用PUT API
    app.put(`/families/${familyId}/records/${editingRecord.id}`, payload)
      .then(() => {
        this.hideEditModal();
        this.loadRecords(); // 重新加载记录
        wx.showToast({ title: '更新成功', icon: 'success' });
      })
      .catch(err => {
        console.error('Update record error:', err);
        wx.showToast({ title: err.message || '更新失败', icon: 'none' });
      });
  },

  validateEditRecord(record) {
    // 注意：编辑记录时，record.type 是后端的枚举值（如 'BREASTFEEDING'），而不是前端的类型（如 'breastfeeding'）
    if (record.type === 'BREASTFEEDING') {
      if (!record.startTime || !record.duration || !record.breast) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (record.type === 'BOTTLE' || record.type === 'FORMULA') {
      if (!record.startTime || !record.amount) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (record.type === 'SOLID') {
      if (!record.startTime || !record.solidType || !record.solidAmount) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (record.type === 'DIAPER') {
      if (!record.startTime || !record.texture || !record.color) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    } else if (record.type === 'GROWTH') {
      if (!record.date || !record.height || !record.weight) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return false;
      }
    }
    
    return true;
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const familyId = app.globalData.familyInfo?.id;
          if (!familyId) {
            wx.showToast({ title: '请先创建或加入家庭', icon: 'none' });
            return;
          }

          // 调用DELETE API
          app.delete(`/families/${familyId}/records/${id}`)
            .then(() => {
              this.loadRecords(); // 重新加载记录
              wx.showToast({ title: '删除成功', icon: 'success' });
            })
            .catch(err => {
              console.error('Delete record error:', err);
              wx.showToast({ title: err.message || '删除失败', icon: 'none' });
            });
        }
      }
    });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
});
