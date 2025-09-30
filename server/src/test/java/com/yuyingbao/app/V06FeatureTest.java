package com.yuyingbao.app;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yuyingbao.app.dto.CreateRecordRequest;
import com.yuyingbao.app.dto.WeChatLoginRequest;
import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.RecordType;
import com.yuyingbao.app.repository.RecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class V06FeatureTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RecordRepository recordRepository;

    private String token;
    private Long familyId;
    private Long babyId;

    @BeforeEach
    public void setUp() throws Exception {
        // 模拟微信登录
        WeChatLoginRequest loginRequest = new WeChatLoginRequest();
        loginRequest.setCode("test_code");
        loginRequest.setNickname("测试用户");
        loginRequest.setAvatarUrl("https://example.com/avatar.jpg");

        MvcResult loginResult = mockMvc.perform(post("/auth/wechat/login-complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.userInfo.nickname").value("测试用户"))
                .andReturn();

        Map<String, Object> loginResponse = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(), Map.class);
        token = (String) loginResponse.get("token");
        token = "Bearer " + token;

        // 获取家庭信息
        MvcResult familyResult = mockMvc.perform(get("/users/me/family")
                .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn();

        Map<String, Object> familyResponse = objectMapper.readValue(
                familyResult.getResponse().getContentAsString(), Map.class);
        familyId = ((Number) familyResponse.get("id")).longValue();

        // 创建宝宝
        Map<String, Object> babyRequest = Map.of(
                "name", "测试宝宝",
                "gender", "BOY",
                "birthDate", "2024-01-01"
        );

        MvcResult babyResult = mockMvc.perform(post("/families/" + familyId + "/babies")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(babyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("测试宝宝"))
                .andReturn();

        Map<String, Object> babyResponse = objectMapper.readValue(
                babyResult.getResponse().getContentAsString(), Map.class);
        babyId = ((Number) babyResponse.get("id")).longValue();
    }

    @Test
    public void testCreateSolidRecordWithEnhancedFields() throws Exception {
        // 创建包含增强字段的辅食记录
        CreateRecordRequest request = new CreateRecordRequest();
        request.setBabyId(babyId);
        request.setType(RecordType.SOLID);
        request.setHappenedAt(OffsetDateTime.now());
        request.setSolidType(com.yuyingbao.app.model.enums.SolidType.OTHER);
        request.setNote("测试辅食");
        // 新增的增强字段
        request.setSolidIngredients("米粉,胡萝卜泥,苹果泥");
        request.setSolidBrand("嘉宝");
        request.setSolidOrigin("美国");

        MvcResult result = mockMvc.perform(post("/families/" + familyId + "/records")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.type").value("SOLID"))
                .andExpect(jsonPath("$.solidIngredients").value("米粉,胡萝卜泥,苹果泥"))
                .andExpect(jsonPath("$.solidBrand").value("嘉宝"))
                .andExpect(jsonPath("$.solidOrigin").value("美国"))
                .andReturn();

        // 验证数据库中的记录
        Map<String, Object> response = objectMapper.readValue(
                result.getResponse().getContentAsString(), Map.class);
        Long recordId = ((Number) response.get("id")).longValue();

        Record record = recordRepository.findById(recordId).orElse(null);
        assertNotNull(record);
        assertEquals("米粉,胡萝卜泥,苹果泥", record.getSolidIngredients());
        assertEquals("嘉宝", record.getSolidBrand());
        assertEquals("美国", record.getSolidOrigin());
    }

    @Test
    public void testUpdateSolidRecordWithEnhancedFields() throws Exception {
        // 先创建一个记录
        Record record = new Record();
        record.setFamilyId(familyId);
        record.setUserId(1L); // 测试用户ID
        record.setBabyId(babyId);
        record.setType(RecordType.SOLID);
        record.setHappenedAt(OffsetDateTime.now());
        record.setSolidType(com.yuyingbao.app.model.enums.SolidType.OTHER);
        record.setNote("原始辅食");

        record = recordRepository.save(record);

        // 更新记录，添加增强字段
        Map<String, Object> updateRequest = Map.of(
                "type", "SOLID",
                "happenedAt", OffsetDateTime.now().toString(),
                "solidType", "OTHER",
                "note", "更新后的辅食",
                "solidIngredients", "米粉,香蕉泥",
                "solidBrand", "亨氏",
                "solidOrigin", "中国"
        );

        mockMvc.perform(put("/families/" + familyId + "/records/" + record.getId())
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solidIngredients").value("米粉,香蕉泥"))
                .andExpect(jsonPath("$.solidBrand").value("亨氏"))
                .andExpect(jsonPath("$.solidOrigin").value("中国"));

        // 验证数据库中的记录
        Record updatedRecord = recordRepository.findById(record.getId()).orElse(null);
        assertNotNull(updatedRecord);
        assertEquals("米粉,香蕉泥", updatedRecord.getSolidIngredients());
        assertEquals("亨氏", updatedRecord.getSolidBrand());
        assertEquals("中国", updatedRecord.getSolidOrigin());
    }

    @Test
    public void testFamilyNameAutoGeneration() throws Exception {
        // 测试家庭名称自动生成
        mockMvc.perform(get("/users/me/family")
                .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("测试用户的家庭"));
    }

    @Test
    public void testBabyIdDisplay() throws Exception {
        // 测试宝宝ID显示
        mockMvc.perform(get("/families/" + familyId + "/babies")
                .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].name").value("测试宝宝"));
    }
}