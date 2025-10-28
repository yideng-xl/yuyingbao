package com.yuyingbao.app.controller;

import com.yuyingbao.app.dto.VoiceTextParseRequest;
import com.yuyingbao.app.dto.VoiceTextParseResponse;
import com.yuyingbao.app.service.AiParseService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AI 辅助功能控制器
 * v0.7 新增
 */
@RestController
@RequestMapping("/api/ai")
public class AiController {
    
    private final AiParseService aiParseService;
    
    public AiController(AiParseService aiParseService) {
        this.aiParseService = aiParseService;
    }
    
    /**
     * 解析语音文本
     * 
     * @param request 语音文本解析请求
     * @return 解析结果
     */
    @PostMapping("/parse-voice-text")
    public ResponseEntity<VoiceTextParseResponse> parseVoiceText(
            @Valid @RequestBody VoiceTextParseRequest request
    ) {
        try {
            VoiceTextParseResponse response = aiParseService.parseVoiceText(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // 返回一个置信度很低的响应
            VoiceTextParseResponse errorResponse = VoiceTextParseResponse.builder()
                    .recordType("")
                    .confidence(0.0)
                    .needsConfirmation(true)
                    .extractedFields(Map.of())
                    .originalText(request.getText())
                    .suggestion("无法识别内容，请重新尝试")
                    .build();
            return ResponseEntity.ok(errorResponse);
        }
    }
}

