package com.yuyingbao.app.security;

import com.yuyingbao.app.BaseIntegrationTest;
import com.yuyingbao.app.dto.CreateFamilyRequest;
import com.yuyingbao.app.dto.CreateRecordRequest;
import com.yuyingbao.app.dto.UpsertBabyRequest;
import com.yuyingbao.app.model.entity.Baby;
import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.model.entity.User;
import com.yuyingbao.app.model.enums.Gender;
import com.yuyingbao.app.model.enums.RecordType;
import com.yuyingbao.app.repository.BabyRepository;
import com.yuyingbao.app.repository.FamilyMemberRepository;
import com.yuyingbao.app.repository.FamilyRepository;
import com.yuyingbao.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 安全和权限验证测试
 * 测试JWT认证、授权机制和数据访问控制
 */
@AutoConfigureMockMvc
@DisplayName("安全和权限验证测试")
class SecurityTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private BabyRepository babyRepository;

    @Autowired
    private UserRepository userRepository;

    private User anotherUser;
    private String anotherUserToken;
    private Family testFamily;
    private Family otherFamily;
    private Baby testBaby;

    @BeforeEach
    void setUpSecurityTestData() {
        // 创建另一个用户
        anotherUser = User.builder()
                .openId("another-user-openid")
                .nickname("另一个用户")
                .avatarUrl("http://test.com/another-avatar.jpg")
                .createdAt(OffsetDateTime.now())
                .build();
        anotherUser = userRepository.save(anotherUser);
        anotherUserToken = jwtService.generateToken(anotherUser.getId(), new HashMap<>());

        // 创建测试家庭（当前用户拥有）
        testFamily = Family.builder()
                .name("测试家庭")
                .inviteCode("TEST123")
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

        // 创建其他家庭（另一个用户拥有）
        otherFamily = Family.builder()
                .name("其他家庭")
                .inviteCode("OTHER456")
                .creatorUserId(anotherUser.getId())
                .createdAt(OffsetDateTime.now())
                .build();
        otherFamily = familyRepository.save(otherFamily);

        // 添加另一个用户为其他家庭的成员
        FamilyMember otherMember = FamilyMember.builder()
                .familyId(otherFamily.getId())
                .userId(anotherUser.getId())
                .role("CREATOR")
                .joinedAt(OffsetDateTime.now())
                .build();
        familyMemberRepository.save(otherMember);

        // 创建测试宝宝
        testBaby = Baby.builder()
                .familyId(testFamily.getId())
                .name("测试宝宝")
                .gender(Gender.BOY)
                .birthDate(LocalDate.of(2023, 6, 15))
                .createdAt(OffsetDateTime.now())
                .build();
        testBaby = babyRepository.save(testBaby);
    }

    // =========================== JWT认证测试 ===========================

    @Test
    @DisplayName("无token访问受保护资源 - 应该返回401")
    void testAccessProtectedResourceWithoutToken_ShouldReturn401() throws Exception {
        CreateFamilyRequest request = new CreateFamilyRequest();
        request.setName("测试家庭");

        mockMvc.perform(post("/families")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("无效token访问受保护资源 - 应该返回401")
    void testAccessProtectedResourceWithInvalidToken_ShouldReturn401() throws Exception {
        CreateFamilyRequest request = new CreateFamilyRequest();
        request.setName("测试家庭");

        mockMvc.perform(post("/families")
                        .header("Authorization", "Bearer invalid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("过期token访问受保护资源 - 应该返回401")
    void testAccessProtectedResourceWithExpiredToken_ShouldReturn401() throws Exception {
        // 这里需要生成一个已过期的token，在实际应用中可能需要修改JWT配置来测试
        // 暂时用无效token代替
        CreateFamilyRequest request = new CreateFamilyRequest();
        request.setName("测试家庭");

        mockMvc.perform(post("/families")
                        .header("Authorization", "Bearer expired.token.here")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("错误的token格式 - 应该返回401")
    void testAccessProtectedResourceWithWrongTokenFormat_ShouldReturn401() throws Exception {
        CreateFamilyRequest request = new CreateFamilyRequest();
        request.setName("测试家庭");

        // 测试各种错误格式
        String[] invalidTokenFormats = {
                "InvalidFormat",           // 缺少Bearer
                "Bearer",                  // 只有Bearer
                "Basic " + testToken,      // 错误的类型
                "Bearer " + testToken + " extra" // 多余内容
        };

        for (String invalidToken : invalidTokenFormats) {
            mockMvc.perform(post("/families")
                            .header("Authorization", invalidToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(request)))
                    .andDo(print())
                    .andExpect(status().isUnauthorized());
        }
    }

    // =========================== 家庭权限测试 ===========================

    @Test
    @DisplayName("访问不属于自己的家庭宝宝 - 应该返回403")
    void testAccessOtherFamilyBabies_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/families/{familyId}/babies", otherFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("在不属于自己的家庭中创建宝宝 - 应该返回403")
    void testCreateBabyInOtherFamily_ShouldReturn403() throws Exception {
        UpsertBabyRequest request = new UpsertBabyRequest();
        request.setName("未授权宝宝");
        request.setGender(Gender.BOY);
        request.setBirthDate(LocalDate.of(2023, 6, 15));

        mockMvc.perform(post("/families/{familyId}/babies", otherFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("访问不属于自己的家庭成员 - 应该返回403")
    void testAccessOtherFamilyMembers_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/families/{familyId}/members", otherFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("在不属于自己的家庭中创建记录 - 应该返回403")
    void testCreateRecordInOtherFamily_ShouldReturn403() throws Exception {
        CreateRecordRequest request = new CreateRecordRequest();
        request.setBabyId(testBaby.getId());
        request.setType(RecordType.BREASTFEEDING);
        request.setHappenedAt(OffsetDateTime.now());
        request.setDurationMin(15);

        mockMvc.perform(post("/families/{familyId}/records", otherFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("访问不属于自己的家庭记录 - 应该返回403")
    void testAccessOtherFamilyRecords_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/families/{familyId}/records", otherFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    // =========================== 跨用户权限测试 ===========================

    @Test
    @DisplayName("另一个用户访问我的家庭资源 - 应该返回403")
    void testAnotherUserAccessMyFamilyResources_ShouldReturn403() throws Exception {
        // 另一个用户尝试访问我的家庭宝宝
        mockMvc.perform(get("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", "Bearer " + anotherUserToken))
                .andDo(print())
                .andExpect(status().isForbidden());

        // 另一个用户尝试访问我的家庭记录
        mockMvc.perform(get("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", "Bearer " + anotherUserToken))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("用户只能访问自己有权限的家庭 - 权限边界测试")
    void testUserCanOnlyAccessAuthorizedFamilies() throws Exception {
        // 当前用户访问自己的家庭 - 应该成功
        mockMvc.perform(get("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isOk());

        // 当前用户访问其他家庭 - 应该失败
        mockMvc.perform(get("/families/{familyId}/babies", otherFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isForbidden());

        // 另一个用户访问自己的家庭 - 应该成功
        mockMvc.perform(get("/families/{familyId}/babies", otherFamily.getId())
                        .header("Authorization", "Bearer " + anotherUserToken))
                .andDo(print())
                .andExpect(status().isOk());

        // 另一个用户访问其他家庭 - 应该失败
        mockMvc.perform(get("/families/{familyId}/babies", testFamily.getId())
                        .header("Authorization", "Bearer " + anotherUserToken))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    // =========================== 数据隔离测试 ===========================

    @Test
    @DisplayName("数据隔离测试 - 用户只能看到自己家庭的数据")
    void testDataIsolation_UsersCanOnlySeeOwnFamilyData() throws Exception {
        // 在自己的家庭中创建记录 - 应该成功
        CreateRecordRequest myRecord = new CreateRecordRequest();
        myRecord.setBabyId(testBaby.getId());
        myRecord.setType(RecordType.BREASTFEEDING);
        myRecord.setHappenedAt(OffsetDateTime.now());
        myRecord.setDurationMin(15);

        mockMvc.perform(post("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(myRecord)))
                .andDo(print())
                .andExpect(status().isOk());

        // 查询自己家庭的记录 - 应该能看到
        mockMvc.perform(get("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isOk());

        // 尝试查询其他家庭的记录 - 应该被拒绝
        mockMvc.perform(get("/families/{familyId}/records", otherFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isForbidden());
    }

    // =========================== 特殊情况测试 ===========================

    @Test
    @DisplayName("访问不存在的资源 - 应该返回404而不是403")
    void testAccessNonexistentResource_ShouldReturn404Not403() throws Exception {
        // 访问不存在的家庭
        mockMvc.perform(get("/families/{familyId}/babies", 99999L)
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("SQL注入防护测试 - 特殊字符不应影响安全")
    void testSQLInjectionProtection() throws Exception {
        // 尝试在URL参数中进行SQL注入
        String maliciousId = "1; DROP TABLE families; --";

        mockMvc.perform(get("/families/{familyId}/babies", maliciousId)
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpect(status().isBadRequest()); // 应该返回400而不是500
    }
}