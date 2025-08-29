package com.yuyingbao.app.controller;

import com.yuyingbao.app.BaseIntegrationTest;
import com.yuyingbao.app.dto.UpsertBabyRequest;
import com.yuyingbao.app.model.entity.Baby;
import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.model.enums.Gender;
import com.yuyingbao.app.repository.BabyRepository;
import com.yuyingbao.app.repository.FamilyMemberRepository;
import com.yuyingbao.app.repository.FamilyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 宝宝管理控制器测试
 * 测试宝宝的创建、查询、更新等功能
 */
@AutoConfigureMockMvc
@DisplayName("宝宝管理接口测试")
class BabyControllerTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BabyRepository babyRepository;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    private Family testFamily;

    @BeforeEach
    void setUpFamily() {
        // 创建测试家庭
        testFamily = Family.builder()
                .name("测试家庭")
                .inviteCode("BABY123")
                .creatorUserId(testUser.getId())
                .createdAt(OffsetDateTime.now())
                .build();
        testFamily = familyRepository.save(testFamily);

        // 添加当前用户为家庭成员
        FamilyMember member = FamilyMember.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .role("CREATOR")
                .joinedAt(OffsetDateTime.now())
                .build();
        familyMemberRepository.save(member);
    }

    @Test
    @DisplayName("创建宝宝 - 应该成功创建并返回宝宝信息")
    void testCreateBaby_ShouldCreateSuccessfully() throws Exception {
        // Given
        UpsertBabyRequest request = new UpsertBabyRequest();
        request.setName("小明");
        request.setGender(Gender.BOY);
        request.setBirthDate(LocalDate.of(2023, 6, 15));
        request.setAvatarUrl("http://test.com/baby-avatar.jpg");
        request.setBirthHeightCm(50.0);
        request.setBirthWeightKg(3.2);

        // When & Then
        mockMvc.perform(post("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("小明")))
                .andExpect(jsonPath("$.gender", is("BOY")))
                .andExpect(jsonPath("$.birthDate", is("2023-06-15")))
                .andExpect(jsonPath("$.avatarUrl", is("http://test.com/baby-avatar.jpg")))
                .andExpect(jsonPath("$.birthHeightCm", is(50.0)))
                .andExpect(jsonPath("$.birthWeightKg", is(3.2)))
                .andExpect(jsonPath("$.familyId", is(testFamily.getId().intValue())));

        // 验证数据库中的数据
        List<Baby> babies = babyRepository.findByFamilyId(testFamily.getId());
        assertEquals(1, babies.size());
        Baby createdBaby = babies.get(0);
        assertEquals("小明", createdBaby.getName());
        assertEquals(Gender.BOY, createdBaby.getGender());
        assertEquals(LocalDate.of(2023, 6, 15), createdBaby.getBirthDate());
        assertEquals("http://test.com/baby-avatar.jpg", createdBaby.getAvatarUrl());
        assertEquals(50.0, createdBaby.getBirthHeightCm());
        assertEquals(3.2, createdBaby.getBirthWeightKg());
    }

    @Test
    @DisplayName("创建宝宝最小信息 - 应该成功创建")
    void testCreateBaby_MinimalInfo_ShouldCreateSuccessfully() throws Exception {
        // Given - 只提供必填字段
        UpsertBabyRequest request = new UpsertBabyRequest();
        request.setName("小红");
        request.setGender(Gender.GIRL);
        request.setBirthDate(LocalDate.of(2023, 8, 20));

        // When & Then
        mockMvc.perform(post("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.name", is("小红")))
                .andExpected(jsonPath("$.gender", is("GIRL")))
                .andExpected(jsonPath("$.birthDate", is("2023-08-20")))
                .andExpected(jsonPath("$.avatarUrl", nullValue()))
                .andExpected(jsonPath("$.birthHeightCm", nullValue()))
                .andExpected(jsonPath("$.birthWeightKg", nullValue()));
    }

    @Test
    @DisplayName("创建宝宝缺少必填字段 - 应该返回400错误")
    void testCreateBaby_MissingRequiredFields_ShouldReturn400() throws Exception {
        // Given - 缺少name字段
        UpsertBabyRequest request = new UpsertBabyRequest();
        request.setGender(Gender.BOY);
        request.setBirthDate(LocalDate.of(2023, 6, 15));

        // When & Then
        mockMvc.perform(post("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isBadRequest());
    }

    @Test
    @DisplayName("创建宝宝未认证 - 应该返回401错误")
    void testCreateBaby_Unauthorized_ShouldReturn401() throws Exception {
        // Given
        UpsertBabyRequest request = new UpsertBabyRequest();
        request.setName("小明");
        request.setGender(Gender.BOY);
        request.setBirthDate(LocalDate.of(2023, 6, 15));

        // When & Then - 不设置Authorization header
        mockMvc.perform(post("/families/{familyId}/babies", testFamily.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isUnauthorized());
    }

    @Test
    @DisplayName("查询家庭宝宝列表 - 应该返回宝宝信息")
    void testGetBabies_ShouldReturnBabies() throws Exception {
        // Given - 创建几个宝宝
        Baby baby1 = Baby.builder()
                .familyId(testFamily.getId())
                .name("宝宝1")
                .gender(Gender.BOY)
                .birthDate(LocalDate.of(2023, 1, 1))
                .avatarUrl("http://test.com/baby1.jpg")
                .birthHeightCm(48.0)
                .birthWeightKg(3.0)
                .createdAt(OffsetDateTime.now())
                .build();
        babyRepository.save(baby1);

        Baby baby2 = Baby.builder()
                .familyId(testFamily.getId())
                .name("宝宝2")
                .gender(Gender.GIRL)
                .birthDate(LocalDate.of(2023, 3, 15))
                .createdAt(OffsetDateTime.now())
                .build();
        babyRepository.save(baby2);

        // When & Then
        mockMvc.perform(get("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(2)))
                .andExpected(jsonPath("$[0].name", anyOf(is("宝宝1"), is("宝宝2"))))
                .andExpected(jsonPath("$[1].name", anyOf(is("宝宝1"), is("宝宝2"))));
    }

    @Test
    @DisplayName("查询空的宝宝列表 - 应该返回空数组")
    void testGetBabies_EmptyList_ShouldReturnEmptyArray() throws Exception {
        // When & Then
        mockMvc.perform(get("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("查询不存在的家庭宝宝 - 应该返回404错误")
    void testGetBabies_NonexistentFamily_ShouldReturn404() throws Exception {
        // When & Then
        mockMvc.perform(get("/families/{familyId}/babies", 99999L)
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isNotFound());
    }

    @Test
    @DisplayName("查询无权限访问的家庭宝宝 - 应该返回403错误")
    void testGetBabies_NoPermission_ShouldReturn403() throws Exception {
        // Given - 创建一个不属于当前用户的家庭
        Family otherFamily = Family.builder()
                .name("其他家庭")
                .inviteCode("OTHER456")
                .creatorUserId(999L) // 不存在的用户ID
                .createdAt(OffsetDateTime.now())
                .build();
        otherFamily = familyRepository.save(otherFamily);

        // When & Then
        mockMvc.perform(get("/families/{familyId}/babies", otherFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isForbidden());
    }

    @Test
    @DisplayName("更新宝宝信息 - 应该成功更新")
    void testUpdateBaby_ShouldUpdateSuccessfully() throws Exception {
        // Given - 先创建一个宝宝
        Baby existingBaby = Baby.builder()
                .familyId(testFamily.getId())
                .name("原名字")
                .gender(Gender.BOY)
                .birthDate(LocalDate.of(2023, 6, 15))
                .avatarUrl("http://test.com/old-avatar.jpg")
                .birthHeightCm(48.0)
                .birthWeightKg(3.0)
                .createdAt(OffsetDateTime.now())
                .build();
        existingBaby = babyRepository.save(existingBaby);

        // 更新请求
        UpsertBabyRequest updateRequest = new UpsertBabyRequest();
        updateRequest.setName("新名字");
        updateRequest.setGender(Gender.BOY);
        updateRequest.setBirthDate(LocalDate.of(2023, 6, 15));
        updateRequest.setAvatarUrl("http://test.com/new-avatar.jpg");
        updateRequest.setBirthHeightCm(50.0);
        updateRequest.setBirthWeightKg(3.5);

        // When & Then
        mockMvc.perform(put("/families/{familyId}/babies/{babyId}", testFamily.getId(), existingBaby.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(updateRequest)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.name", is("新名字")))
                .andExpected(jsonPath("$.avatarUrl", is("http://test.com/new-avatar.jpg")))
                .andExpected(jsonPath("$.birthHeightCm", is(50.0)))
                .andExpected(jsonPath("$.birthWeightKg", is(3.5)));

        // 验证数据库中的数据已更新
        Baby updatedBaby = babyRepository.findById(existingBaby.getId()).orElse(null);
        assertNotNull(updatedBaby);
        assertEquals("新名字", updatedBaby.getName());
        assertEquals("http://test.com/new-avatar.jpg", updatedBaby.getAvatarUrl());
        assertEquals(50.0, updatedBaby.getBirthHeightCm());
        assertEquals(3.5, updatedBaby.getBirthWeightKg());
    }

    @Test
    @DisplayName("更新不存在的宝宝 - 应该返回404错误")
    void testUpdateBaby_NonexistentBaby_ShouldReturn404() throws Exception {
        // Given
        UpsertBabyRequest updateRequest = new UpsertBabyRequest();
        updateRequest.setName("不存在的宝宝");
        updateRequest.setGender(Gender.BOY);
        updateRequest.setBirthDate(LocalDate.of(2023, 6, 15));

        // When & Then
        mockMvc.perform(put("/families/{familyId}/babies/{babyId}", testFamily.getId(), 99999L)
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(updateRequest)))
                .andDo(print())
                .andExpected(status().isNotFound());
    }
}