package com.yuyingbao.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yuyingbao.app.BaseIntegrationTest;
import com.yuyingbao.app.dto.UpsertBabyRequest;
import com.yuyingbao.app.model.entity.Baby;
import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.model.entity.User;
import com.yuyingbao.app.model.enums.Gender;
import com.yuyingbao.app.repository.BabyRepository;
import com.yuyingbao.app.repository.FamilyMemberRepository;
import com.yuyingbao.app.repository.FamilyRepository;
import com.yuyingbao.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class MultipleBabiesTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private BabyRepository babyRepository;

    private User testUser;
    private Family testFamily;

    @BeforeEach
    void setUp() {
        // 创建测试用户
        testUser = User.builder()
                .openId("test-multiple-babies-user")
                .nickname("测试用户")
                .avatarUrl("http://test.com/avatar.jpg")
                .createdAt(OffsetDateTime.now())
                .build();
        testUser = userRepository.save(testUser);

        // 创建测试家庭
        testFamily = Family.builder()
                .name("多胞胎测试家庭")
                .inviteCode("TEST001")
                .creatorUserId(testUser.getId())
                .createdAt(OffsetDateTime.now())
                .build();
        testFamily = familyRepository.save(testFamily);

        // 添加家庭成员关系
        FamilyMember familyMember = FamilyMember.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .role("CREATOR")
                .joinedAt(OffsetDateTime.now())
                .build();
        familyMemberRepository.save(familyMember);
    }

    @Test
    @DisplayName("多胞胎管理 - 创建多个宝宝")
    void testCreateMultipleBabies() throws Exception {
        // 创建第一个宝宝（双胞胎老大）
        UpsertBabyRequest baby1Request = new UpsertBabyRequest();
        baby1Request.setName("宝宝老大");
        baby1Request.setGender(Gender.BOY);
        baby1Request.setBirthDate(LocalDate.of(2024, 1, 15));
        baby1Request.setAvatarUrl("http://test.com/baby1-avatar.jpg");
        baby1Request.setBirthHeightCm(50.0);
        baby1Request.setBirthWeightKg(3.2);

        mockMvc.perform(post("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(baby1Request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("宝宝老大"))
                .andExpect(jsonPath("$.gender").value("BOY"));

        // 创建第二个宝宝（双胞胎老二）
        UpsertBabyRequest baby2Request = new UpsertBabyRequest();
        baby2Request.setName("宝宝老二");
        baby2Request.setGender(Gender.GIRL);
        baby2Request.setBirthDate(LocalDate.of(2024, 1, 15)); // 同一天出生
        baby2Request.setAvatarUrl("http://test.com/baby2-avatar.jpg");
        baby2Request.setBirthHeightCm(48.5);
        baby2Request.setBirthWeightKg(3.0);

        mockMvc.perform(post("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(baby2Request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("宝宝老二"))
                .andExpect(jsonPath("$.gender").value("GIRL"));

        // 验证数据库中有两个宝宝
        List<Baby> babies = babyRepository.findByFamilyId(testFamily.getId());
        assertEquals(2, babies.size());
        
        // 验证宝宝信息
        Baby baby1 = babies.stream().filter(b -> "宝宝老大".equals(b.getName())).findFirst().orElse(null);
        Baby baby2 = babies.stream().filter(b -> "宝宝老二".equals(b.getName())).findFirst().orElse(null);
        
        assertNotNull(baby1);
        assertNotNull(baby2);
        assertEquals(Gender.BOY, baby1.getGender());
        assertEquals(Gender.GIRL, baby2.getGender());
        assertEquals(LocalDate.of(2024, 1, 15), baby1.getBirthDate());
        assertEquals(LocalDate.of(2024, 1, 15), baby2.getBirthDate());
    }

    @Test
    @DisplayName("多胞胎管理 - 获取家庭宝宝列表")
    void testGetMultipleBabiesList() throws Exception {
        // 先创建两个宝宝
        Baby baby1 = Baby.builder()
                .familyId(testFamily.getId())
                .name("龙凤胎哥哥")
                .gender(Gender.BOY)
                .birthDate(LocalDate.of(2024, 2, 14))
                .avatarUrl("http://test.com/baby1.jpg")
                .birthHeightCm(51.0)
                .birthWeightKg(3.3)
                .createdAt(OffsetDateTime.now())
                .build();
        babyRepository.save(baby1);

        Baby baby2 = Baby.builder()
                .familyId(testFamily.getId())
                .name("龙凤胎妹妹")
                .gender(Gender.GIRL)
                .birthDate(LocalDate.of(2024, 2, 14))
                .avatarUrl("http://test.com/baby2.jpg")
                .birthHeightCm(49.5)
                .birthWeightKg(3.1)
                .createdAt(OffsetDateTime.now())
                .build();
        babyRepository.save(baby2);

        // 获取宝宝列表
        mockMvc.perform(get("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("龙凤胎哥哥"))
                .andExpect(jsonPath("$[1].name").value("龙凤胎妹妹"));
    }

    @Test
    @DisplayName("多胞胎管理 - 更新指定宝宝信息")
    void testUpdateSpecificBaby() throws Exception {
        // 先创建一个宝宝
        Baby existingBaby = Baby.builder()
                .familyId(testFamily.getId())
                .name("小宝")
                .gender(Gender.BOY)
                .birthDate(LocalDate.of(2024, 3, 1))
                .avatarUrl("http://test.com/baby.jpg")
                .birthHeightCm(50.0)
                .birthWeightKg(3.2)
                .createdAt(OffsetDateTime.now())
                .build();
        existingBaby = babyRepository.save(existingBaby);

        // 更新宝宝信息
        UpsertBabyRequest updateRequest = new UpsertBabyRequest();
        updateRequest.setName("小宝贝");
        updateRequest.setGender(Gender.BOY);
        updateRequest.setBirthDate(LocalDate.of(2024, 3, 1));
        updateRequest.setAvatarUrl("http://test.com/baby-updated.jpg");
        updateRequest.setBirthHeightCm(52.0);
        updateRequest.setBirthWeightKg(3.5);

        mockMvc.perform(put("/families/{familyId}/babies/{babyId}", testFamily.getId(), existingBaby.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("小宝贝"))
                .andExpect(jsonPath("$.avatarUrl").value("http://test.com/baby-updated.jpg"))
                .andExpect(jsonPath("$.birthHeightCm").value(52.0))
                .andExpect(jsonPath("$.birthWeightKg").value(3.5));

        // 验证数据库中的数据已更新
        Baby updatedBaby = babyRepository.findById(existingBaby.getId()).orElse(null);
        assertNotNull(updatedBaby);
        assertEquals("小宝贝", updatedBaby.getName());
        assertEquals("http://test.com/baby-updated.jpg", updatedBaby.getAvatarUrl());
        assertEquals(52.0, updatedBaby.getBirthHeightCm());
        assertEquals(3.5, updatedBaby.getBirthWeightKg());
    }

    @Test
    @DisplayName("多胞胎管理 - 删除指定宝宝")
    void testDeleteSpecificBaby() throws Exception {
        // 先创建两个宝宝
        Baby baby1 = Baby.builder()
                .familyId(testFamily.getId())
                .name("要保留的宝宝")
                .gender(Gender.BOY)
                .birthDate(LocalDate.of(2024, 4, 1))
                .createdAt(OffsetDateTime.now())
                .build();
        baby1 = babyRepository.save(baby1);

        Baby baby2 = Baby.builder()
                .familyId(testFamily.getId())
                .name("要删除的宝宝")
                .gender(Gender.GIRL)
                .birthDate(LocalDate.of(2024, 4, 1))
                .createdAt(OffsetDateTime.now())
                .build();
        baby2 = babyRepository.save(baby2);

        // 删除第二个宝宝
        mockMvc.perform(delete("/families/{familyId}/babies/{babyId}", testFamily.getId(), baby2.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isOk());

        // 验证数据库中只剩下一个宝宝
        List<Baby> remainingBabies = babyRepository.findByFamilyId(testFamily.getId());
        assertEquals(1, remainingBabies.size());
        assertEquals("要保留的宝宝", remainingBabies.get(0).getName());

        // 验证被删除的宝宝确实不存在
        assertFalse(babyRepository.findById(baby2.getId()).isPresent());
    }

    @Test
    @DisplayName("权限验证 - 不能访问其他家庭的宝宝")
    void testCannotAccessOtherFamilyBabies() throws Exception {
        // 创建另一个家庭
        Family otherFamily = Family.builder()
                .name("其他家庭")
                .inviteCode("OTHER123")
                .creatorUserId(999L) // 不存在的用户ID
                .createdAt(OffsetDateTime.now())
                .build();
        otherFamily = familyRepository.save(otherFamily);

        // 在其他家庭中创建宝宝
        Baby otherBaby = Baby.builder()
                .familyId(otherFamily.getId())
                .name("其他家庭的宝宝")
                .gender(Gender.BOY)
                .birthDate(LocalDate.of(2024, 5, 1))
                .createdAt(OffsetDateTime.now())
                .build();
        otherBaby = babyRepository.save(otherBaby);

        // 尝试访问其他家庭的宝宝列表，应该返回403
        mockMvc.perform(get("/families/{familyId}/babies", otherFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isForbidden());

        // 尝试更新其他家庭的宝宝，应该返回403
        UpsertBabyRequest updateRequest = new UpsertBabyRequest();
        updateRequest.setName("恶意更新");
        updateRequest.setGender(Gender.BOY);
        updateRequest.setBirthDate(LocalDate.of(2024, 5, 1));

        mockMvc.perform(put("/families/{familyId}/babies/{babyId}", otherFamily.getId(), otherBaby.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andDo(print())
                .andExpect(status().isForbidden());
    }
}