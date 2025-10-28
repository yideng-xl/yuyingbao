package com.yuyingbao.app.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 语音文本解析请求 DTO
 * v0.7 新增
 */
@Data
public class VoiceTextParseRequest {
    
    /**
     * 语音识别的文本内容
     */
    @NotBlank(message = "文本内容不能为空")
    @Size(max = 500, message = "文本长度不能超过500个字符")
    private String text;
    
    /**
     * 记录类型提示（可选）
     * 帮助AI更准确地识别记录类型
     */
    private String recordTypeHint;
    
    /**
     * 宝宝ID（可选）
     * 用于上下文判断
     */
    private Long babyId;
    
    /**
     * 置信度阈值（可选）
     * 低于此阈值时可能需要用户手动确认
     */
    private Double confidenceThreshold;
}

