Component({
  properties: {
    // 图表类型：bar（柱状图）、pie（饼图）、line（折线图）
    type: {
      type: String,
      value: 'bar'
    },
    // 图表数据
    data: {
      type: Array,
      value: []
    },
    // 图表配置
    config: {
      type: Object,
      value: {}
    },
    // 图表标题
    title: {
      type: String,
      value: ''
    },
    // 图表高度
    height: {
      type: Number,
      value: 300
    }
  },

  data: {
    canvasId: '',
    canvasWidth: 0,
    canvasHeight: 0
  },

    lifetimes: {
    attached() {
      // 生成唯一的canvas ID
      const canvasId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.setData({
        canvasId
      });
      
      // 立即初始化，不需要等待 DOM
      this.initChart();
    },

    ready() {
      // 备用初始化
      if (!this.data.canvasWidth || !this.data.canvasHeight) {
        this.initChart();
      }
    }
  },

  observers: {
    'data, type, config': function() {
      // 数据变化时重新绘制图表
      // 延迟执行，确保 canvas 已经完全初始化
      clearTimeout(this._drawTimer);
      this._drawTimer = setTimeout(() => {
        if (this.data.canvasWidth > 0 && this.data.canvasId) {
          this.drawChart();
        }
      }, 50);
    }
  },

  methods: {
    initChart() {
      // 确保 canvasId 已经准备好
      if (!this.data.canvasId) {
        return;
      }
      
      // 如果已经初始化过，跳过
      if (this.data.canvasWidth > 0 && this.data.canvasHeight > 0) {
        this.drawChart();
        return;
      }
      
      try {
        // 获取系统信息，计算 canvas 尺寸
        const systemInfo = wx.getSystemInfoSync();
        const windowWidth = systemInfo.windowWidth;
        
        // 图表高度（从 rpx 转换为 px）
        const heightInPx = (this.data.height / 750) * windowWidth;
        
        // 计算容器宽度（留出左右 padding）
        const containerWidth = windowWidth - 48; // 24rpx * 2 = 48rpx padding
        
        this.setData({
          canvasWidth: containerWidth,
          canvasHeight: heightInPx
        }, () => {
          console.log('Canvas 初始化完成:', {
            canvasId: this.data.canvasId,
            width: this.data.canvasWidth,
            height: this.data.canvasHeight
          });
          
          // 延迟绘制，确保 setData 完成
          setTimeout(() => {
            this.drawChart();
          }, 10);
        });
      } catch (error) {
        console.error('Canvas 初始化失败:', error);
      }
    },

    drawChart() {
      const { type, data } = this.data;
      
      if (!data || data.length === 0) {
        this.drawEmptyState();
        return;
      }

      switch (type) {
        case 'bar':
          this.drawBarChart();
          break;
        case 'pie':
          this.drawPieChart();
          break;
        case 'line':
          this.drawLineChart();
          break;
        default:
          console.warn('不支持的图表类型:', type);
      }
    },

    // 绘制空状态
    drawEmptyState() {
      const ctx = wx.createCanvasContext(this.data.canvasId, this);
      const { canvasWidth, canvasHeight } = this.data;
      
      // 清空画布
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // 绘制空状态文本
      ctx.setFillStyle('#999999');
      ctx.setFontSize(16);
      ctx.setTextAlign('center');
      ctx.fillText('暂无数据', canvasWidth / 2, canvasHeight / 2);
      
      ctx.draw();
    },

    // 绘制柱状图
    drawBarChart() {
      const ctx = wx.createCanvasContext(this.data.canvasId, this);
      const { data, canvasWidth, canvasHeight, config } = this.data;
      
      // 清空画布
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // 图表区域配置
      const padding = 40;
      const chartWidth = canvasWidth - padding * 2;
      const chartHeight = canvasHeight - padding * 2;
      const chartLeft = padding;
      const chartTop = padding;
      
      // 获取最大值用于缩放
      const maxValue = Math.max(...data.map(item => item.value || 0));
      const valueScale = maxValue > 0 ? chartHeight * 0.8 / maxValue : 1;
      
      // 绘制坐标轴
      ctx.setStrokeStyle('#E0E0E0');
      ctx.setLineWidth(1);
      
      // Y轴
      ctx.beginPath();
      ctx.moveTo(chartLeft, chartTop);
      ctx.lineTo(chartLeft, chartTop + chartHeight);
      ctx.stroke();
      
      // X轴
      ctx.beginPath();
      ctx.moveTo(chartLeft, chartTop + chartHeight);
      ctx.lineTo(chartLeft + chartWidth, chartTop + chartHeight);
      ctx.stroke();
      
      // 绘制Y轴刻度
      const ySteps = 4;
      ctx.setFillStyle('#666666');
      ctx.setFontSize(12);
      ctx.setTextAlign('right');
      
      for (let i = 0; i <= ySteps; i++) {
        const y = chartTop + chartHeight - (i / ySteps) * chartHeight * 0.8;
        const value = Math.round((maxValue / ySteps) * i);
        
        // 刻度线
        ctx.setStrokeStyle('#F0F0F0');
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(chartLeft + chartWidth, y);
        ctx.stroke();
        
        // 刻度文本
        ctx.fillText(value.toString(), chartLeft - 10, y + 4);
      }
      
      // 绘制柱状图
      const barWidth = chartWidth / data.length * 0.6;
      const barSpacing = chartWidth / data.length;
      
      data.forEach((item, index) => {
        const barHeight = (item.value || 0) * valueScale;
        const x = chartLeft + index * barSpacing + (barSpacing - barWidth) / 2;
        const y = chartTop + chartHeight - barHeight;
        
        // 绘制柱子
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, config.color || '#4A90E2');
        gradient.addColorStop(1, config.endColor || '#7ED321');
        
        ctx.setFillStyle(gradient);
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 绘制数值标签
        ctx.setFillStyle('#333333');
        ctx.setFontSize(12);
        ctx.setTextAlign('center');
        ctx.fillText((item.value || 0).toString(), x + barWidth / 2, y - 8);
        
        // 绘制X轴标签
        ctx.setFillStyle('#666666');
        ctx.setFontSize(11);
        ctx.fillText(item.label || '', x + barWidth / 2, chartTop + chartHeight + 20);
      });
      
      ctx.draw();
    },

    // 绘制饼图
    drawPieChart() {
      const ctx = wx.createCanvasContext(this.data.canvasId, this);
      const { data, canvasWidth, canvasHeight } = this.data;
      
      // 清空画布
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2 - 20; // 为图例留出空间
      const radius = Math.min(canvasWidth, canvasHeight) / 3;
      
      // 计算总值
      const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
      
      if (total === 0) {
        this.drawEmptyState();
        return;
      }
      
      // 颜色数组
      const colors = ['#4A90E2', '#7ED321', '#FFB74D', '#FF6B6B', '#9C27B0', '#00BCD4'];
      
      let currentAngle = -Math.PI / 2; // 从12点方向开始
      
      data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        const color = colors[index % colors.length];
        
        // 绘制扇形
        ctx.setFillStyle(color);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        
        // 绘制百分比标签
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * radius * 0.7;
        const labelY = centerY + Math.sin(labelAngle) * radius * 0.7;
        const percentage = Math.round((item.value / total) * 100);
        
        if (percentage >= 5) { // 只显示大于5%的标签
          ctx.setFillStyle('#FFFFFF');
          ctx.setFontSize(12);
          ctx.setTextAlign('center');
          ctx.fillText(`${percentage}%`, labelX, labelY);
        }
        
        currentAngle += sliceAngle;
      });
      
      // 绘制图例
      const legendY = canvasHeight - 60;
      const legendItemWidth = canvasWidth / data.length;
      
      data.forEach((item, index) => {
        const color = colors[index % colors.length];
        const x = index * legendItemWidth + legendItemWidth / 2;
        
        // 图例色块
        ctx.setFillStyle(color);
        ctx.fillRect(x - 15, legendY, 12, 12);
        
        // 图例文本
        ctx.setFillStyle('#333333');
        ctx.setFontSize(11);
        ctx.setTextAlign('center');
        ctx.fillText(item.label || '', x, legendY + 25);
        ctx.fillText(`${item.value}`, x, legendY + 40);
      });
      
      ctx.draw();
    },

    // 绘制折线图
    drawLineChart() {
      const ctx = wx.createCanvasContext(this.data.canvasId, this);
      const { data, canvasWidth, canvasHeight, config } = this.data;
      
      // 清空画布
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // 图表区域配置
      const padding = 40;
      const chartWidth = canvasWidth - padding * 2;
      const chartHeight = canvasHeight - padding * 2;
      const chartLeft = padding;
      const chartTop = padding;
      
      // 获取最大值和最小值
      const values = data.map(item => item.value || 0);
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const valueRange = maxValue - minValue || 1;
      
      // 绘制坐标轴
      ctx.setStrokeStyle('#E0E0E0');
      ctx.setLineWidth(1);
      
      // Y轴
      ctx.beginPath();
      ctx.moveTo(chartLeft, chartTop);
      ctx.lineTo(chartLeft, chartTop + chartHeight);
      ctx.stroke();
      
      // X轴
      ctx.beginPath();
      ctx.moveTo(chartLeft, chartTop + chartHeight);
      ctx.lineTo(chartLeft + chartWidth, chartTop + chartHeight);
      ctx.stroke();
      
      // 绘制网格线和Y轴刻度
      const ySteps = 4;
      ctx.setFillStyle('#666666');
      ctx.setFontSize(12);
      ctx.setTextAlign('right');
      
      for (let i = 0; i <= ySteps; i++) {
        const y = chartTop + chartHeight - (i / ySteps) * chartHeight * 0.9;
        const value = minValue + (valueRange / ySteps) * i;
        
        // 网格线
        ctx.setStrokeStyle('#F0F0F0');
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(chartLeft + chartWidth, y);
        ctx.stroke();
        
        // 刻度文本
        ctx.fillText(value.toFixed(1), chartLeft - 10, y + 4);
      }
      
      // 绘制折线
      if (data.length > 1) {
        ctx.setStrokeStyle(config.color || '#4A90E2');
        ctx.setLineWidth(3);
        ctx.beginPath();
        
        data.forEach((item, index) => {
          const x = chartLeft + (index / (data.length - 1)) * chartWidth;
          const y = chartTop + chartHeight - ((item.value - minValue) / valueRange) * chartHeight * 0.9;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.stroke();
        
        // 绘制数据点
        data.forEach((item, index) => {
          const x = chartLeft + (index / (data.length - 1)) * chartWidth;
          const y = chartTop + chartHeight - ((item.value - minValue) / valueRange) * chartHeight * 0.9;
          
          // 数据点
          ctx.setFillStyle(config.color || '#4A90E2');
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // 数值标签
          ctx.setFillStyle('#333333');
          ctx.setFontSize(11);
          ctx.setTextAlign('center');
          ctx.fillText(item.value.toString(), x, y - 12);
          
          // X轴标签
          ctx.setFillStyle('#666666');
          ctx.setFontSize(10);
          ctx.fillText(item.label || '', x, chartTop + chartHeight + 20);
        });
      }
      
      ctx.draw();
    }
  }
});