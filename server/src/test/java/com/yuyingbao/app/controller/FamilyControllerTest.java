package com.yuyingbao.app.controller;

import com.yuyingbao.app.BaseIntegrationTest;
import com.yuyingbao.app.dto.CreateFamilyRequest;
import com.yuyingbao.app.dto.JoinFamilyRequest;
import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.model.entity.User;
import com.yuyingbao.app.repository.FamilyMemberRepository;
import com.yuyingbao.app.repository.FamilyRepository;
import com.yuyingbao.app.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 家庭管理控制器测试
 * 测试家庭的创建、加入、查询等功能
 */
@AutoConfigureMockMvc
@DisplayName("家庭管理接口测试")
class FamilyControllerTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("创建家庭 - 应该成功创建并返回家庭信息")
    void testCreateFamily_ShouldCreateSuccessfully() throws Exception {
        // Given
        CreateFamilyRequest request = new CreateFamilyRequest();
        request.setName("测试家庭");

        // When & Then
        mockMvc.perform(post("/families")
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("测试家庭")))
                .andExpect(jsonPath("$.inviteCode", notNullValue()))
                .andExpect(jsonPath("$.creatorUserId", is(testUser.getId().intValue())));

        // 验证数据库中的数据
        List<Family> families = familyRepository.findAll();
        assertEquals(1, families.size());
        Family createdFamily = families.get(0);
        assertEquals("测试家庭", createdFamily.getName());
        assertEquals(testUser.getId(), createdFamily.getCreatorUserId());
        assertNotNull(createdFamily.getInviteCode());

        // 验证创建者自动成为家庭成员
        List<FamilyMember> members = familyMemberRepository.findByFamilyId(createdFamily.getId());
        assertEquals(1, members.size());
        FamilyMember creator = members.get(0);
        assertEquals(testUser.getId(), creator.getUserId());
        assertEquals("CREATOR", creator.getRole());
    }

    @Test
    @DisplayName("创建家庭缺少必填字段 - 应该返回400错误")
    void testCreateFamily_MissingRequiredFields_ShouldReturn400() throws Exception {
        // Given - 空的请求体
        CreateFamilyRequest request = new CreateFamilyRequest();
        // 不设置name

        // When & Then
        mockMvc.perform(post("/families")
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("创建家庭未认证 - 应该返回401错误")
    void testCreateFamily_Unauthorized_ShouldReturn401() throws Exception {
        // Given
        CreateFamilyRequest request = new CreateFamilyRequest();
        request.setName("测试家庭");

        // When & Then - 不设置Authorization header
        mockMvc.perform(post("/families")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("加入家庭 - 应该成功加入并返回家庭信息")
    void testJoinFamily_ShouldJoinSuccessfully() throws Exception {
        // Given - 先创建一个家庭
        Family existingFamily = Family.builder()
                .name("已存在的家庭")
                .inviteCode("TEST123")
                .creatorUserId(testUser.getId())
                .createdAt(OffsetDateTime.now())
                .build();
        familyRepository.save(existingFamily);

        // 创建另一个用户来加入家庭
        User anotherUser = User.builder()
                .openId("another-user-openid")
                .nickname("另一个用户")
                .avatarUrl("http://test.com/another-avatar.jpg")
                .createdAt(OffsetDateTime.now())
                .build();
        anotherUser = userRepository.save(anotherUser);
        String anotherUserToken = jwtService.generateToken(anotherUser.getId(), new HashMap<>());

        JoinFamilyRequest request = new JoinFamilyRequest();
        request.setInviteCode("TEST123");

        // When & Then
        mockMvc.perform(post("/families/join")
                        .header("Authorization", "Bearer " + anotherUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("已存在的家庭")))
                .andExpect(jsonPath("$.inviteCode", is("TEST123")));

        // 验证家庭成员
        List<FamilyMember> members = familyMemberRepository.findByFamilyId(existingFamily.getId());
        assertEquals(1, members.size()); // 只有加入的用户，创建者在这个测试中没有添加为成员
        FamilyMember newMember = members.get(0);
        assertEquals(anotherUser.getId(), newMember.getUserId());
        assertEquals("MEMBER", newMember.getRole());
    }

    @Test
    @DisplayName("加入家庭使用无效邀请码 - 应该返回404错误")
    void testJoinFamily_InvalidInviteCode_ShouldReturn404() throws Exception {
        // Given
        JoinFamilyRequest request = new JoinFamilyRequest();
        request.setInviteCode("INVALID");

        // When & Then
        mockMvc.perform(post("/families/join")
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("重复加入同一个家庭 - 应该返回409错误")
    void testJoinFamily_DuplicateJoin_ShouldReturn409() throws Exception {
        // Given - 先创建一个家庭
        Family existingFamily = Family.builder()
                .name("已存在的家庭")
                .inviteCode("TEST456")
                .creatorUserId(testUser.getId())
                .createdAt(OffsetDateTime.now())
                .build();
        familyRepository.save(existingFamily);

        // 用户先加入一次
        FamilyMember existingMember = FamilyMember.builder()
                .familyId(existingFamily.getId())
                .userId(testUser.getId())
                .role("MEMBER")
                .joinedAt(OffsetDateTime.now())
                .build();
        familyMemberRepository.save(existingMember);

        JoinFamilyRequest request = new JoinFamilyRequest();
        request.setInviteCode("TEST456");

        // When & Then - 尝试再次加入
        mockMvc.perform(post("/families/join")
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("查询家庭成员列表 - 应该返回成员信息")
    void testGetFamilyMembers_ShouldReturnMembers() throws Exception {
        // Given - 创建家庭和成员
        Family family = Family.builder()
                .name("测试家庭")
                .inviteCode("MEMBERS123")
                .creatorUserId(testUser.getId())
                .createdAt(OffsetDateTime.now())
                .build();
        family = familyRepository.save(family);

        // 添加成员
        FamilyMember member1 = FamilyMember.builder()
                .familyId(family.getId())
                .userId(testUser.getId())
                .role("CREATOR")
                .joinedAt(OffsetDateTime.now())
                .build();
        familyMemberRepository.save(member1);

        User anotherUser = User.builder()
                .openId("member2-openid")
                .nickname("成员2")
                .avatarUrl("http://test.com/member2-avatar.jpg")
                .createdAt(OffsetDateTime.now())
                .build();
        anotherUser = userRepository.save(anotherUser);

        FamilyMember member2 = FamilyMember.builder()
                .familyId(family.getId())
                .userId(anotherUser.getId())
                .role("MEMBER")
                .joinedAt(OffsetDateTime.now())
                .build();
        familyMemberRepository.save(member2);

        // When & Then
        mockMvc.perform(get("/families/{familyId}/members", family.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].userId", anyOf(is(testUser.getId().intValue()), is(anotherUser.getId().intValue()))))
                .andExpect(jsonPath("$[1].userId", anyOf(is(testUser.getId().intValue()), is(anotherUser.getId().intValue()))));
    }

    @Test
    @DisplayName("查询不存在的家庭成员 - 应该返回404错误")
    void testGetFamilyMembers_NonexistentFamily_ShouldReturn404() throws Exception {
        // When & Then
        mockMvc.perform(get("/families/{familyId}/members", 99999L)
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("查询无权限访问的家庭成员 - 应该返回403错误")
    void testGetFamilyMembers_NoPermission_ShouldReturn403() throws Exception {
        // Given - 创建一个不属于当前用户的家庭
        User anotherUser = User.builder()
                .openId("other-user-openid")
                .nickname("其他用户")
                .createdAt(OffsetDateTime.now())
                .build();
        anotherUser = userRepository.save(anotherUser);

        Family otherFamily = Family.builder()
                .name("其他家庭")
                .inviteCode("OTHER123")
                .creatorUserId(anotherUser.getId())
                .createdAt(OffsetDateTime.now())
                .build();
        otherFamily = familyRepository.save(otherFamily);

        // When & Then
        mockMvc.perform(get("/families/{familyId}/members", otherFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isForbidden());
    }
}