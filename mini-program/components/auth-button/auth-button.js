Component({
  properties: {
    needAuth: {
      type: Boolean,
      value: true
    },
    title: {
      type: String,
      value: '用户授权'
    },
    desc: {
      type: String,
      value: '为了更好地为您服务，需要获取您的基本信息'
    },
    buttonText: {
      type: String,
      value: '立即授权'
    }
  },

  data: {},

  methods: {
    onAuthorize() {
      const that = this;
      wx.getUserProfile({
        desc: this.data.desc,
        success: (res) => {
          console.log('获取用户信息成功', res.userInfo);
          that.triggerEvent('authsuccess', res);
        },
        fail: (err) => {
          console.log('获取用户信息失败', err);
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
          that.triggerEvent('authfail', err);
        }
      });
    }
  }
});