package com.yuyingbao.app.controller;

import com.yuyingbao.app.BaseIntegrationTest;
import com.yuyingbao.app.dto.CreateRecordRequest;
import com.yuyingbao.app.dto.UpdateRecordRequest;
import com.yuyingbao.app.model.entity.Baby;
import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.*;
import com.yuyingbao.app.repository.BabyRepository;
import com.yuyingbao.app.repository.FamilyMemberRepository;
import com.yuyingbao.app.repository.FamilyRepository;
import com.yuyingbao.app.repository.RecordRepository;
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
 * 记录管理控制器测试
 * 测试所有类型记录的CRUD功能
 */
@AutoConfigureMockMvc
@DisplayName("记录管理接口测试")
class RecordControllerTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RecordRepository recordRepository;

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private BabyRepository babyRepository;

    private Family testFamily;
    private Baby testBaby;

    @BeforeEach
    void setUpFamilyAndBaby() {
        // 创建测试家庭
        testFamily = Family.builder()
                .name("测试家庭")
                .inviteCode("RECORD123")
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

    @Test
    @DisplayName("创建母乳亲喂记录 - 应该成功创建")
    void testCreateBreastfeedingRecord_ShouldCreateSuccessfully() throws Exception {
        // Given
        CreateRecordRequest request = new CreateRecordRequest();
        request.setBabyId(testBaby.getId());
        request.setType(RecordType.BREASTFEEDING);
        request.setHappenedAt(OffsetDateTime.now());
        request.setDurationMin(15);
        request.setBreastfeedingSide("LEFT");

        // When & Then
        mockMvc.perform(post("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("BREASTFEEDING")))
                .andExpected(jsonPath("$.durationMin", is(15)))
                .andExpected(jsonPath("$.breastfeedingSide", is("LEFT")))
                .andExpected(jsonPath("$.babyId", is(testBaby.getId().intValue())))
                .andExpected(jsonPath("$.userId", is(testUser.getId().intValue())));
    }

    @Test
    @DisplayName("创建瓶喂记录 - 应该成功创建")
    void testCreateBottleRecord_ShouldCreateSuccessfully() throws Exception {
        // Given
        CreateRecordRequest request = new CreateRecordRequest();
        request.setBabyId(testBaby.getId());
        request.setType(RecordType.BOTTLE);
        request.setHappenedAt(OffsetDateTime.now());
        request.setAmountMl(120.0);

        // When & Then
        mockMvc.perform(post("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("BOTTLE")))
                .andExpected(jsonPath("$.amountMl", is(120.0)));
    }

    @Test
    @DisplayName("创建辅食记录 - 应该成功创建")
    void testCreateSolidRecord_ShouldCreateSuccessfully() throws Exception {
        // Given
        CreateRecordRequest request = new CreateRecordRequest();
        request.setBabyId(testBaby.getId());
        request.setType(RecordType.SOLID);
        request.setHappenedAt(OffsetDateTime.now());
        request.setSolidType(SolidType.RICE_CEREAL);
        request.setNote("第一次尝试米糊");

        // When & Then
        mockMvc.perform(post("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("SOLID")))
                .andExpected(jsonPath("$.solidType", is("RICE_CEREAL")))
                .andExpected(jsonPath("$.note", is("第一次尝试米糊")));
    }

    @Test
    @DisplayName("创建大便记录 - 应该成功创建")
    void testCreateDiaperRecord_ShouldCreateSuccessfully() throws Exception {
        // Given
        CreateRecordRequest request = new CreateRecordRequest();
        request.setBabyId(testBaby.getId());
        request.setType(RecordType.DIAPER);
        request.setHappenedAt(OffsetDateTime.now());
        request.setDiaperTexture(DiaperTexture.SOFT);
        request.setDiaperColor(DiaperColor.YELLOW);
        request.setHasUrine(true);

        // When & Then
        mockMvc.perform(post("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("DIAPER")))
                .andExpected(jsonPath("$.diaperTexture", is("SOFT")))
                .andExpected(jsonPath("$.diaperColor", is("YELLOW")))
                .andExpected(jsonPath("$.hasUrine", is(true)));
    }

    @Test
    @DisplayName("创建成长记录 - 应该成功创建")
    void testCreateGrowthRecord_ShouldCreateSuccessfully() throws Exception {
        // Given
        CreateRecordRequest request = new CreateRecordRequest();
        request.setBabyId(testBaby.getId());
        request.setType(RecordType.GROWTH);
        request.setHappenedAt(OffsetDateTime.now());
        request.setHeightCm(65.5);
        request.setWeightKg(7.2);
        request.setNote("满月体检");

        // When & Then
        mockMvc.perform(post("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.type", is("GROWTH")))
                .andExpected(jsonPath("$.heightCm", is(65.5)))
                .andExpected(jsonPath("$.weightKg", is(7.2)))
                .andExpected(jsonPath("$.note", is("满月体检")));
    }

    @Test
    @DisplayName("创建记录缺少必填字段 - 应该返回400错误")
    void testCreateRecord_MissingRequiredFields_ShouldReturn400() throws Exception {
        // Given - 缺少babyId字段
        CreateRecordRequest request = new CreateRecordRequest();
        request.setType(RecordType.BREASTFEEDING);
        request.setHappenedAt(OffsetDateTime.now());

        // When & Then
        mockMvc.perform(post("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(request)))
                .andDo(print())
                .andExpected(status().isBadRequest());
    }

    @Test
    @DisplayName("查询记录列表 - 应该返回记录列表")
    void testListRecords_ShouldReturnRecords() throws Exception {
        // Given - 创建几条记录
        Record record1 = Record.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .babyId(testBaby.getId())
                .type(RecordType.BREASTFEEDING)
                .happenedAt(OffsetDateTime.now().minusHours(2))
                .durationMin(10)
                .breastfeedingSide("LEFT")
                .build();
        recordRepository.save(record1);

        Record record2 = Record.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .babyId(testBaby.getId())
                .type(RecordType.BOTTLE)
                .happenedAt(OffsetDateTime.now().minusHours(1))
                .amountMl(100.0)
                .build();
        recordRepository.save(record2);

        // When & Then
        mockMvc.perform(get("/families/{familyId}/records", testFamily.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(2)))
                .andExpected(jsonPath("$[0].type", anyOf(is("BREASTFEEDING"), is("BOTTLE"))))
                .andExpected(jsonPath("$[1].type", anyOf(is("BREASTFEEDING"), is("BOTTLE"))));
    }

    @Test
    @DisplayName("按类型筛选记录 - 应该返回指定类型的记录")
    void testListRecordsWithTypeFilter_ShouldReturnFilteredRecords() throws Exception {
        // Given - 创建不同类型的记录
        Record breastfeedingRecord = Record.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .babyId(testBaby.getId())
                .type(RecordType.BREASTFEEDING)
                .happenedAt(OffsetDateTime.now().minusHours(2))
                .durationMin(10)
                .build();
        recordRepository.save(breastfeedingRecord);

        Record bottleRecord = Record.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .babyId(testBaby.getId())
                .type(RecordType.BOTTLE)
                .happenedAt(OffsetDateTime.now().minusHours(1))
                .amountMl(100.0)
                .build();
        recordRepository.save(bottleRecord);

        // When & Then - 只查询母乳记录
        mockMvc.perform(get("/families/{familyId}/records/filter", testFamily.getId())
                        .param("type", "BREASTFEEDING")
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(1)))
                .andExpected(jsonPath("$[0].type", is("BREASTFEEDING")));
    }

    @Test
    @DisplayName("按时间范围筛选记录 - 应该返回时间范围内的记录")
    void testListRecordsWithTimeFilter_ShouldReturnFilteredRecords() throws Exception {
        // Given - 创建不同时间的记录
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime yesterday = now.minusDays(1);
        OffsetDateTime tomorrow = now.plusDays(1);

        Record oldRecord = Record.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .babyId(testBaby.getId())
                .type(RecordType.BREASTFEEDING)
                .happenedAt(yesterday)
                .durationMin(10)
                .build();
        recordRepository.save(oldRecord);

        Record recentRecord = Record.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .babyId(testBaby.getId())
                .type(RecordType.BOTTLE)
                .happenedAt(now)
                .amountMl(100.0)
                .build();
        recordRepository.save(recentRecord);

        // When & Then - 查询今天的记录
        mockMvc.perform(get("/families/{familyId}/records/filter", testFamily.getId())
                        .param("start", now.minusHours(1).toString())
                        .param("end", tomorrow.toString())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$", hasSize(1)))
                .andExpected(jsonPath("$[0].type", is("BOTTLE")));
    }

    @Test
    @DisplayName("更新记录 - 应该成功更新")
    void testUpdateRecord_ShouldUpdateSuccessfully() throws Exception {
        // Given - 先创建一条记录
        Record existingRecord = Record.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .babyId(testBaby.getId())
                .type(RecordType.BREASTFEEDING)
                .happenedAt(OffsetDateTime.now())
                .durationMin(10)
                .breastfeedingSide("LEFT")
                .build();
        existingRecord = recordRepository.save(existingRecord);

        // 更新请求
        UpdateRecordRequest updateRequest = new UpdateRecordRequest();
        updateRequest.setType(RecordType.BREASTFEEDING);
        updateRequest.setHappenedAt(OffsetDateTime.now().plusMinutes(5));
        updateRequest.setDurationMin(15);
        updateRequest.setBreastfeedingSide("RIGHT");

        // When & Then
        mockMvc.perform(put("/families/{familyId}/records/{recordId}", testFamily.getId(), existingRecord.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(updateRequest)))
                .andDo(print())
                .andExpected(status().isOk())
                .andExpected(jsonPath("$.durationMin", is(15)))
                .andExpected(jsonPath("$.breastfeedingSide", is("RIGHT")));

        // 验证数据库中的数据已更新
        Record updatedRecord = recordRepository.findById(existingRecord.getId()).orElse(null);
        assertNotNull(updatedRecord);
        assertEquals(15, updatedRecord.getDurationMin());
        assertEquals("RIGHT", updatedRecord.getBreastfeedingSide());
    }

    @Test
    @DisplayName("更新不存在的记录 - 应该返回404错误")
    void testUpdateRecord_NonexistentRecord_ShouldReturn404() throws Exception {
        // Given
        UpdateRecordRequest updateRequest = new UpdateRecordRequest();
        updateRequest.setType(RecordType.BREASTFEEDING);
        updateRequest.setHappenedAt(OffsetDateTime.now());

        // When & Then
        mockMvc.perform(put("/families/{familyId}/records/{recordId}", testFamily.getId(), 99999L)
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(updateRequest)))
                .andDo(print())
                .andExpected(status().isNotFound());
    }

    @Test
    @DisplayName("删除记录 - 应该成功删除")
    void testDeleteRecord_ShouldDeleteSuccessfully() throws Exception {
        // Given - 先创建一条记录
        Record existingRecord = Record.builder()
                .familyId(testFamily.getId())
                .userId(testUser.getId())
                .babyId(testBaby.getId())
                .type(RecordType.BREASTFEEDING)
                .happenedAt(OffsetDateTime.now())
                .durationMin(10)
                .build();
        existingRecord = recordRepository.save(existingRecord);

        // When & Then
        mockMvc.perform(delete("/families/{familyId}/records/{recordId}", testFamily.getId(), existingRecord.getId())
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isNoContent());

        // 验证记录已被删除
        boolean recordExists = recordRepository.existsById(existingRecord.getId());
        assertFalse(recordExists);
    }

    @Test
    @DisplayName("删除不存在的记录 - 应该返回404错误")
    void testDeleteRecord_NonexistentRecord_ShouldReturn404() throws Exception {
        // When & Then
        mockMvc.perform(delete("/families/{familyId}/records/{recordId}", testFamily.getId(), 99999L)
                        .header("Authorization", getAuthHeader()))
                .andDo(print())
                .andExpected(status().isNotFound());
    }

    @Test
    @DisplayName("测试记录权限验证 - 不能访问其他家庭的记录")
    void testRecordPermission_ShouldRestrictAccess() throws Exception {
        // Given - 创建另一个家庭的记录
        Family otherFamily = Family.builder()
                .name("其他家庭")
                .inviteCode("OTHER789")
                .creatorUserId(999L)
                .createdAt(OffsetDateTime.now())
                .build();
        otherFamily = familyRepository.save(otherFamily);

        Record otherRecord = Record.builder()
                .familyId(otherFamily.getId())
                .userId(999L)
                .babyId(testBaby.getId())
                .type(RecordType.BREASTFEEDING)
                .happenedAt(OffsetDateTime.now())
                .durationMin(10)
                .build();
        otherRecord = recordRepository.save(otherRecord);

        // When & Then - 尝试更新其他家庭的记录
        UpdateRecordRequest updateRequest = new UpdateRecordRequest();
        updateRequest.setType(RecordType.BREASTFEEDING);
        updateRequest.setHappenedAt(OffsetDateTime.now());

        mockMvc.perform(put("/families/{familyId}/records/{recordId}", otherFamily.getId(), otherRecord.getId())
                        .header("Authorization", getAuthHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(updateRequest)))
                .andDo(print())
                .andExpected(status().isForbidden());
    }
}