package com.yuyingbao.app.controller;

import com.yuyingbao.app.BaseIntegrationTest;
import com.yuyingbao.app.dto.WeChatLoginRequest;
import com.yuyingbao.app.model.entity.User;
import com.yuyingbao.app.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 认证控制器测试
 * 测试微信登录等相关功能
 */
@AutoConfigureMockMvc
@DisplayName("认证接口测试")
class AuthControllerTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("新用户微信登录 - 应该创建用户并返回token")
    void testWeChatLogin_NewUser_ShouldCreateUserAndReturnToken() throws Exception {
        // Given
        WeChatLoginRequest request = new WeChatLoginRequest();
        request.setCode("test_code_123");
        request.setNickname("新用户");
        request.setAvatarUrl("http://test.com/new-avatar.jpg");

        // When & Then
        mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")));

        // 验证用户是否被创建
        User createdUser = userRepository.findByOpenId("test_code_123")
                .orElse(null);
        assertNotNull(createdUser);
        assertEquals("新用户", createdUser.getNickname());
        assertEquals("http://test.com/new-avatar.jpg", createdUser.getAvatarUrl());
    }

    @Test
    @DisplayName("已存在用户微信登录 - 应该返回token而不创建新用户")
    void testWeChatLogin_ExistingUser_ShouldReturnTokenWithoutCreatingNewUser() throws Exception {
        // Given - 先创建一个用户
        User existingUser = User.builder()
                .openId("existing_user_openid")
                .nickname("已存在用户")
                .avatarUrl("http://test.com/existing-avatar.jpg")
                .createdAt(java.time.OffsetDateTime.now())
                .build();
        userRepository.save(existingUser);

        WeChatLoginRequest request = new WeChatLoginRequest();
        request.setCode("existing_user_openid");
        request.setNickname("更新的昵称");
        request.setAvatarUrl("http://test.com/updated-avatar.jpg");

        long userCountBefore = userRepository.count();

        // When & Then
        mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")));

        // 验证没有创建新用户
        long userCountAfter = userRepository.count();
        assertEquals(userCountBefore, userCountAfter);

        // 验证用户信息是否被更新
        User updatedUser = userRepository.findByOpenId("existing_user_openid")
                .orElse(null);
        assertNotNull(updatedUser);
        assertEquals("更新的昵称", updatedUser.getNickname());
        assertEquals("http://test.com/updated-avatar.jpg", updatedUser.getAvatarUrl());
    }

    @Test
    @DisplayName("微信登录缺少必填字段 - 应该返回400错误")
    void testWeChatLogin_MissingRequiredFields_ShouldReturn400() throws Exception {
        // Given - 缺少code字段
        WeChatLoginRequest request = new WeChatLoginRequest();
        request.setNickname("测试用户");
        request.setAvatarUrl("http://test.com/avatar.jpg");

        // When & Then
        mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("微信登录空的请求体 - 应该返回400错误")
    void testWeChatLogin_EmptyRequestBody_ShouldReturn400() throws Exception {
        // When & Then
        mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("微信登录无效的JSON - 应该返回400错误")
    void testWeChatLogin_InvalidJson_ShouldReturn400() throws Exception {
        // When & Then
        mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("invalid json"))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("微信登录只有昵称 - 应该成功")
    void testWeChatLogin_OnlyNicknameProvided_ShouldSuccess() throws Exception {
        // Given
        WeChatLoginRequest request = new WeChatLoginRequest();
        request.setCode("test_code_minimal");
        request.setNickname("最小用户");
        // 不设置avatarUrl

        // When & Then
        mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")));

        // 验证用户创建
        User createdUser = userRepository.findByOpenId("test_code_minimal")
                .orElse(null);
        assertNotNull(createdUser);
        assertEquals("最小用户", createdUser.getNickname());
        assertNull(createdUser.getAvatarUrl());
    }
}