package com.yuyingbao.app.integration;

import com.yuyingbao.app.BaseIntegrationTest;
import com.yuyingbao.app.dto.*;
import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.*;
import com.yuyingbao.app.repository.FamilyRepository;
import com.yuyingbao.app.repository.RecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 端到端集成测试
 * 模拟完整的用户使用流程
 */
@AutoConfigureMockMvc
@DisplayName("端到端集成测试")
class EndToEndIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private RecordRepository recordRepository;

    @Test
    @DisplayName("完整用户流程测试 - 从注册到记录管理")
    void testCompleteUserJourney_FromRegistrationToRecordManagement() throws Exception {
        // ============ 1. 用户注册/登录 ============
        WeChatLoginRequest loginRequest = new WeChatLoginRequest();
        loginRequest.setCode("e2e_test_user_001");
        loginRequest.setNickname("端到端测试用户");
        loginRequest.setAvatarUrl("http://test.com/e2e-avatar.jpg");

        MvcResult loginResult = mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(loginRequest)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.token", notNullValue()))
                .andReturn();

        // 解析token
        String responseBody = loginResult.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> loginResponse = fromJson(responseBody, Map.class);
        String userToken = "Bearer " + loginResponse.get("token");

        // ============ 2. 创建家庭 ============
        CreateFamilyRequest familyRequest = new CreateFamilyRequest();
        familyRequest.setName("端到端测试家庭");

        MvcResult familyResult = mockMvc.perform(post("/families")
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(familyRequest)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.name", is("端到端测试家庭")))
                .andExpected(jsonPath("$.inviteCode", notNullValue()))
                .andReturn();

        // 解析家庭信息
        String familyResponseBody = familyResult.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> familyResponse = fromJson(familyResponseBody, Map.class);
        Long familyId = Long.valueOf(familyResponse.get("id").toString());

        // ============ 3. 添加宝宝 ============
        UpsertBabyRequest babyRequest = new UpsertBabyRequest();
        babyRequest.setName("小测试");
        babyRequest.setGender(Gender.BOY);
        babyRequest.setBirthDate(LocalDate.of(2023, 6, 15));
        babyRequest.setAvatarUrl("http://test.com/baby-e2e.jpg");
        babyRequest.setBirthHeightCm(50.0);
        babyRequest.setBirthWeightKg(3.2);

        MvcResult babyResult = mockMvc.perform(post("/families/{familyId}/babies", familyId)
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(babyRequest)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.name", is("小测试")))
                .andReturn();

        // 解析宝宝信息
        String babyResponseBody = babyResult.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> babyResponse = fromJson(babyResponseBody, Map.class);
        Long babyId = Long.valueOf(babyResponse.get("id").toString());

        // ============ 4. 创建各种类型的记录 ============
        
        // 4.1 创建母乳亲喂记录
        CreateRecordRequest breastfeedingRecord = new CreateRecordRequest();
        breastfeedingRecord.setBabyId(babyId);
        breastfeedingRecord.setType(RecordType.BREASTFEEDING);
        breastfeedingRecord.setHappenedAt(OffsetDateTime.now().minusHours(3));
        breastfeedingRecord.setDurationMin(15);
        breastfeedingRecord.setBreastfeedingSide("LEFT");

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(breastfeedingRecord)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("BREASTFEEDING")));

        // 4.2 创建瓶喂记录
        CreateRecordRequest bottleRecord = new CreateRecordRequest();
        bottleRecord.setBabyId(babyId);
        bottleRecord.setType(RecordType.BOTTLE);
        bottleRecord.setHappenedAt(OffsetDateTime.now().minusHours(2));
        bottleRecord.setAmountMl(120.0);

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(bottleRecord)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("BOTTLE")));

        // 4.3 创建大便记录
        CreateRecordRequest diaperRecord = new CreateRecordRequest();
        diaperRecord.setBabyId(babyId);
        diaperRecord.setType(RecordType.DIAPER);
        diaperRecord.setHappenedAt(OffsetDateTime.now().minusHours(1));
        diaperRecord.setDiaperTexture(DiaperTexture.SOFT);
        diaperRecord.setDiaperColor(DiaperColor.YELLOW);
        diaperRecord.setHasUrine(true);

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(diaperRecord)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("DIAPER")));

        // 4.4 创建成长记录
        CreateRecordRequest growthRecord = new CreateRecordRequest();
        growthRecord.setBabyId(babyId);
        growthRecord.setType(RecordType.GROWTH);
        growthRecord.setHappenedAt(OffsetDateTime.now());
        growthRecord.setHeightCm(65.5);
        growthRecord.setWeightKg(7.2);
        growthRecord.setNote("满月体检");

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(growthRecord)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("GROWTH")));

        // ============ 5. 查询和筛选记录 ============
        
        // 5.1 查询所有记录
        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", userToken))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(4)));

        // 5.2 按类型筛选 - 只查询喂养记录
        mockMvc.perform(get("/families/{familyId}/records/filter", familyId)
                        .param("type", "BREASTFEEDING")
                        .header("Authorization", userToken))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(1)))
                .andExpected(jsonPath("$[0].type", is("BREASTFEEDING")));

        // 5.3 按时间筛选 - 查询最近1小时的记录
        OffsetDateTime oneHourAgo = OffsetDateTime.now().minusHours(1);
        OffsetDateTime now = OffsetDateTime.now().plusMinutes(5);

        mockMvc.perform(get("/families/{familyId}/records/filter", familyId)
                        .param("start", oneHourAgo.toString())
                        .param("end", now.toString())
                        .header("Authorization", userToken))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(2))); // 应该有大便记录和成长记录

        // ============ 6. 更新记录 ============
        
        // 获取第一条记录用于更新测试
        MvcResult recordsResult = mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", userToken))
                .andExpected(status().isOk())
                .andReturn();

        String recordsResponseBody = recordsResult.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> records = fromJson(recordsResponseBody, List.class);
        assertFalse(records.isEmpty());
        
        Long recordId = Long.valueOf(records.get(0).get("id").toString());

        // 更新记录
        UpdateRecordRequest updateRequest = new UpdateRecordRequest();
        updateRequest.setType(RecordType.BREASTFEEDING);
        updateRequest.setHappenedAt(OffsetDateTime.now());
        updateRequest.setDurationMin(20); // 更新时长
        updateRequest.setBreastfeedingSide("RIGHT"); // 更新乳房

        mockMvc.perform(put("/families/{familyId}/records/{recordId}", familyId, recordId)
                        .header("Authorization", userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(updateRequest)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.durationMin", is(20)))
                .andExpected(jsonPath("$.breastfeedingSide", is("RIGHT")));

        // ============ 7. 查询家庭成员 ============
        mockMvc.perform(get("/families/{familyId}/members", familyId)
                        .header("Authorization", userToken))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(1)))
                .andExpected(jsonPath("$[0].role", is("CREATOR")));

        // ============ 8. 查询宝宝列表 ============
        mockMvc.perform(get("/families/{familyId}/babies", familyId)
                        .header("Authorization", userToken))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(1)))
                .andExpected(jsonPath("$[0].name", is("小测试")));

        // ============ 9. 删除记录 ============
        mockMvc.perform(delete("/families/{familyId}/records/{recordId}", familyId, recordId)
                        .header("Authorization", userToken))
                .andDo(print())
                .andExpected(status().isNoContent());

        // 验证记录已删除
        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", userToken))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(3))); // 应该还剩3条记录

        // ============ 验证数据完整性 ============
        
        // 验证数据库中的数据
        List<Family> families = familyRepository.findAll();
        assertTrue(families.stream().anyMatch(f -> f.getName().equals("端到端测试家庭")));

        List<Record> remainingRecords = recordRepository.findByFamilyId(familyId);
        assertEquals(3, remainingRecords.size());
        
        // 验证记录类型分布
        long bottleRecords = remainingRecords.stream().filter(r -> r.getType() == RecordType.BOTTLE).count();
        long diaperRecords = remainingRecords.stream().filter(r -> r.getType() == RecordType.DIAPER).count();
        long growthRecords = remainingRecords.stream().filter(r -> r.getType() == RecordType.GROWTH).count();
        
        assertEquals(1, bottleRecords);
        assertEquals(1, diaperRecords);
        assertEquals(1, growthRecords);
    }

    @Test
    @DisplayName("多用户家庭协作测试")
    void testMultiUserFamilyCollaboration() throws Exception {
        // ============ 1. 用户A创建家庭 ============
        WeChatLoginRequest userALoginRequest = new WeChatLoginRequest();
        userALoginRequest.setCode("e2e_user_a");
        userALoginRequest.setNickname("用户A");

        MvcResult userALoginResult = mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userALoginRequest)))
                .andExpected(status().isOk())
                .andReturn();

        @SuppressWarnings("unchecked")
        Map<String, Object> userALoginResponse = fromJson(userALoginResult.getResponse().getContentAsString(), Map.class);
        String userAToken = "Bearer " + userALoginResponse.get("token");

        // 用户A创建家庭
        CreateFamilyRequest familyRequest = new CreateFamilyRequest();
        familyRequest.setName("协作测试家庭");

        MvcResult familyResult = mockMvc.perform(post("/families")
                        .header("Authorization", userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(familyRequest)))
                .andExpected(status().isOk())
                .andReturn();

        @SuppressWarnings("unchecked")
        Map<String, Object> familyResponse = fromJson(familyResult.getResponse().getContentAsString(), Map.class);
        Long familyId = Long.valueOf(familyResponse.get("id").toString());
        String inviteCode = familyResponse.get("inviteCode").toString();

        // ============ 2. 用户B加入家庭 ============
        WeChatLoginRequest userBLoginRequest = new WeChatLoginRequest();
        userBLoginRequest.setCode("e2e_user_b");
        userBLoginRequest.setNickname("用户B");

        MvcResult userBLoginResult = mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userBLoginRequest)))
                .andExpected(status().isOk())
                .andReturn();

        @SuppressWarnings("unchecked")
        Map<String, Object> userBLoginResponse = fromJson(userBLoginResult.getResponse().getContentAsString(), Map.class);
        String userBToken = "Bearer " + userBLoginResponse.get("token");

        // 用户B加入家庭
        JoinFamilyRequest joinRequest = new JoinFamilyRequest();
        joinRequest.setInviteCode(inviteCode);

        mockMvc.perform(post("/families/join")
                        .header("Authorization", userBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(joinRequest)))
                .andDo(print())
                .andExpected(status().isOk());

        // ============ 3. 用户A添加宝宝 ============
        UpsertBabyRequest babyRequest = new UpsertBabyRequest();
        babyRequest.setName("协作宝宝");
        babyRequest.setGender(Gender.GIRL);
        babyRequest.setBirthDate(LocalDate.of(2023, 8, 1));

        MvcResult babyResult = mockMvc.perform(post("/families/{familyId}/babies", familyId)
                        .header("Authorization", userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(babyRequest)))
                .andExpected(status().isOk())
                .andReturn();

        @SuppressWarnings("unchecked")
        Map<String, Object> babyResponse = fromJson(babyResult.getResponse().getContentAsString(), Map.class);
        Long babyId = Long.valueOf(babyResponse.get("id").toString());

        // ============ 4. 两个用户都能创建记录 ============
        
        // 用户A创建记录
        CreateRecordRequest userARecord = new CreateRecordRequest();
        userARecord.setBabyId(babyId);
        userARecord.setType(RecordType.BREASTFEEDING);
        userARecord.setHappenedAt(OffsetDateTime.now().minusHours(1));
        userARecord.setDurationMin(10);

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userARecord)))
                .andExpected(status().isOk());

        // 用户B创建记录
        CreateRecordRequest userBRecord = new CreateRecordRequest();
        userBRecord.setBabyId(babyId);
        userBRecord.setType(RecordType.BOTTLE);
        userBRecord.setHappenedAt(OffsetDateTime.now());
        userBRecord.setAmountMl(150.0);

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", userBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userBRecord)))
                .andExpected(status().isOk());

        // ============ 5. 两个用户都能查看所有记录 ============
        
        // 用户A查看记录
        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", userAToken))
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(2)));

        // 用户B也能查看相同的记录
        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", userBToken))
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(2)));

        // ============ 6. 验证家庭成员列表 ============
        mockMvc.perform(get("/families/{familyId}/members", familyId)
                        .header("Authorization", userAToken))
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(2)));

        mockMvc.perform(get("/families/{familyId}/members", familyId)
                        .header("Authorization", userBToken))
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(2)));
    }
}