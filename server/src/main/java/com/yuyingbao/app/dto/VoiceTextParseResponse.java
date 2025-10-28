package com.yuyingbao.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

/**
 * 语音文本解析响应 DTO
 * v0.7 新增
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceTextParseResponse {
    
    /**
     * 解析的记录类型
     * BREASTFEEDING, BOTTLE, FORMULA, SOLID, WATER, NUTRITION 等
     */
    private String recordType;
    
    /**
     * 解析置信度（0-1之间）
     * 用于评估解析结果的可靠性
     */
    private Double confidence;
    
    /**
     * 是否建议用户手动确认
     * 当置信度较低时，建议用户确认解析结果
     */
    private Boolean needsConfirmation;
    
    /**
     * 解析出的具体字段
     * 例如：
     * - amount: 奶量
     * - duration: 时长
     * - nutritionTypes: 营养素类型
     * - side: 左右侧
     */
    private Map<String, Object> extractedFields;
    
    /**
     * 原始文本（用于用户确认）
     */
    private String originalText;
    
    /**
     * 解析建议（如："识别到瓶喂100毫升配方奶，请确认"）
     */
    private String suggestion;
}

