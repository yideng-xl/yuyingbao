// 导入被测试的页面
require('../pages/profile/profile.js');

describe('Profile Page', () => {
  let pageInstance;
  
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 重置mockApp
    global.mockApp = {
      globalData: {
        userInfo: { id: 1, nickname: '测试用户', avatarUrl: 'test-avatar-url' },
        familyInfo: null,
        babyInfo: null
      },
      get: jest.fn().mockResolvedValue({}),
      post: jest.fn().mockResolvedValue({}),
      put: jest.fn().mockResolvedValue({}),
      request: jest.fn().mockResolvedValue({}),
      getUserProfile: jest.fn()
    };
    
    // 获取Page实例
    pageInstance = global.pageInstances[0];
  });
  
  describe('showInviteModal', () => {
    it('应该显示邀请弹窗并生成6位邀请码', () => {
      // 调用函数
      pageInstance.showInviteModal();
      
      // 验证结果
      expect(pageInstance.setData).toHaveBeenCalledWith({
        showInviteModal: true,
        inviteCode: expect.stringMatching(/^\d{6}$/)
      });
    });
  });
  
  describe('onJoinCodeInput', () => {
    it('应该在输入6位数字时验证邀请码', async () => {
      // 模拟后端验证成功
      global.mockApp.get.mockResolvedValue({
        name: '测试家庭',
        members: [{}, {}] // 2个成员
      });
      
      // 调用函数
      pageInstance.onJoinCodeInput({ detail: { value: '123456' } });
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 验证结果
      expect(global.mockApp.get).toHaveBeenCalledWith('/families/validate-invite-code/123456');
    });
    
    it('应该在输入非6位数字时清除匹配的家庭信息', () => {
      // 调用函数
      pageInstance.setData({ matchedFamily: { name: '测试家庭' } });
      pageInstance.onJoinCodeInput({ detail: { value: '123' } });
      
      // 验证结果
      expect(pageInstance.setData).toHaveBeenCalledWith({ matchedFamily: null });
    });
  });
  
  describe('joinFamily', () => {
    it('应该调用后端API加入家庭', async () => {
      // 准备测试数据
      pageInstance.data = {
        ...pageInstance.data,
        joinCode: '123456'
      };
      
      global.mockApp.post.mockResolvedValue({
        id: 1,
        name: '测试家庭'
      });
      
      // 调用函数
      await pageInstance.joinFamily();
      
      // 验证结果
      expect(global.mockApp.post).toHaveBeenCalledWith('/families/join', { inviteCode: '123456' });
    });
  });
  
  describe('editMemberRole', () => {
    it('应该显示编辑成员角色弹窗', () => {
      // 准备测试数据
      pageInstance.data = {
        ...pageInstance.data,
        familyInfo: {
          members: [
            { id: 1, memberRole: 'FATHER' }
          ]
        }
      };
      
      // 调用函数
      pageInstance.editMemberRole({ currentTarget: { dataset: { memberId: 1 } } });
      
      // 验证结果
      expect(pageInstance.setData).toHaveBeenCalledWith({
        showEditRoleModal: true,
        editingMemberId: 1,
        selectedRole: 'FATHER'
      });
    });
  });
  
  describe('saveMemberRole', () => {
    it('应该保存成员角色', async () => {
      // 准备测试数据
      pageInstance.data = {
        ...pageInstance.data,
        familyInfo: {
          id: 1,
          members: [
            { id: 1, memberRole: '', memberRoleDisplayName: '' }
          ]
        },
        editingMemberId: 1,
        selectedRole: 'FATHER'
      };
      
      global.mockApp.put.mockResolvedValue({
        memberRole: 'FATHER',
        memberRoleDisplayName: '爸爸'
      });
      
      // 调用函数
      await pageInstance.saveMemberRole();
      
      // 验证结果
      expect(global.mockApp.put).toHaveBeenCalledWith('/families/1/members/1/role', { memberRole: 'FATHER' });
    });
  });
});