const app = getApp();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    needAuth: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '完善用户信息'
    },
    desc: {
      type: String,
      value: '获取您的微信昵称和头像，提供更好的服务'
    },
    buttonText: {
      type: String,
      value: '立即授权'
    },
    useOpenType: {
      type: Boolean,
      value: false // 是否使用open-type方式（已废弃）
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 授权按钮点击事件
     */
    onAuthTap() {
      if (this.properties.useOpenType) {
        // 使用open-type方式（旧版本兼容）
        return;
      }
      
      // 使用新的getUserProfile方式
      app.getUserProfile((success, userInfo) => {
        if (success) {
          this.triggerEvent('authsuccess', {
            userInfo: userInfo
          });
        } else {
          this.triggerEvent('authfail', {
            error: '获取用户信息失败'
          });
        }
      });
    },

    /**
     * 旧版本open-type方式的回调（兼容性）
     */
    onGetUserInfo(e) {
      if (e.detail.userInfo) {
        this.triggerEvent('authsuccess', {
          userInfo: e.detail.userInfo
        });
      } else {
        this.triggerEvent('authfail', {
          error: '用户拒绝授权'
        });
      }
    }
  }
});