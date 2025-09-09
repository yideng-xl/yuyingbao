package com.yuyingbao.app;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yuyingbao.app.model.entity.User;
import com.yuyingbao.app.repository.UserRepository;
import com.yuyingbao.app.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * 测试基础类
 * 提供通用的测试配置和工具方法
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
@Transactional
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected JwtService jwtService;

    protected User testUser;
    protected String testToken;

    @BeforeEach
    void setUp() {
        // 创建测试用户
        testUser = User.builder()
                .openId("test-openid-123")
                .nickname("测试用户")
                .avatarUrl("http://test.com/avatar.jpg")
                .createdAt(OffsetDateTime.now())
                .build();
        testUser = userRepository.save(testUser);

        // 生成测试token
        testToken = jwtService.generateToken(testUser.getId(), Map.of());
    }

    /**
     * 获取认证头
     */
    protected String getAuthHeader() {
        return "Bearer " + testToken;
    }

    /**
     * 将对象转换为JSON字符串
     */
    protected String toJson(Object obj) throws Exception {
        return objectMapper.writeValueAsString(obj);
    }

    /**
     * 从JSON字符串转换为对象
     */
    protected <T> T fromJson(String json, Class<T> clazz) throws Exception {
        return objectMapper.readValue(json, clazz);
    }
}