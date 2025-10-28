// components/voice-input/voice-input.js
Component({
  properties: {
    // 是否显示语音输入界面
    show: {
      type: Boolean,
      value: false
    },
    // 记录类型提示
    recordType: {
      type: String,
      value: ''
    }
  },

  data: {
    isRecording: false,
    recognizedText: '',
    isParsing: false,
    parseResult: null
  },

  methods: {
    /**
     * 开始录音
     */
    onStartRecord() {
      this.setData({ 
        isRecording: true,
        recognizedText: ''
      });

      const recorderManager = wx.getRecorderManager();
      
      recorderManager.onStart(() => {
        console.log('录音开始');
      });

      recorderManager.onError((err) => {
        console.error('录音失败', err);
        wx.showToast({
          title: '录音失败，请重试',
          icon: 'none'
        });
        this.setData({ isRecording: false });
      });

      recorderManager.onStop((res) => {
        console.log('录音停止', res);
        this.setData({ isRecording: false });
        this.recognizeVoice(res.tempFilePath);
      });

      recorderManager.start({
        duration: 60000, // 最长60秒
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'mp3'
      });
    },

    /**
     * 停止录音
     */
    onStopRecord() {
      const recorderManager = wx.getRecorderManager();
      recorderManager.stop();
    },

    /**
     * 识别语音
     */
    recognizeVoice(tempFilePath) {
      wx.showLoading({ title: '识别中...' });

      // 使用微信语音识别
      const recognizerManager = wx.getRecognizerManager();
      
      recognizerManager.onRecognize((res) => {
        console.log('识别中', res);
        if (res.result) {
          this.setData({ recognizedText: res.result });
        }
      });

      recognizerManager.onStop((res) => {
        wx.hideLoading();
        if (res.result) {
          this.setData({ recognizedText: res.result });
          // 自动解析
          this.parseText(res.result);
        } else {
          wx.showToast({
            title: '识别失败，请重试',
            icon: 'none'
          });
        }
      });

      recognizerManager.onError((err) => {
        wx.hideLoading();
        console.error('识别错误', err);
        wx.showToast({
          title: '识别失败，请重试',
          icon: 'none'
        });
      });

      // 开始识别
      recognizerManager.start();
    },

    /**
     * 解析文本
     */
    parseText(text) {
      if (!text || text.trim() === '') {
        return;
      }

      this.setData({ isParsing: true });

      const app = getApp();
      
      app.post('/ai/parse-voice-text', {
        text: text,
        recordTypeHint: this.properties.recordType
      }).then(result => {
        console.log('解析结果', result);
        this.setData({ 
          parseResult: result,
          isParsing: false
        });
        
        // 通知父组件解析完成
        this.triggerEvent('parsed', {
          text: text,
          parseResult: result
        });
      }).catch(err => {
        console.error('解析失败', err);
        wx.showToast({
          title: '解析失败，请重试',
          icon: 'none'
        });
        this.setData({ isParsing: false });
      });
    },

    /**
     * 确认使用解析结果
     */
    onConfirm() {
      if (this.data.parseResult) {
        this.triggerEvent('confirm', {
          parseResult: this.data.parseResult
        });
      }
    },

    /**
     * 取消
     */
    onCancel() {
      this.triggerEvent('cancel');
    },

    /**
     * 关闭弹窗
     */
    onClose() {
      this.triggerEvent('close');
    }
  }
});

