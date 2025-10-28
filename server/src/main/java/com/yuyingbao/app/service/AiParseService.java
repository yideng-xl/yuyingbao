package com.yuyingbao.app.service;

import com.yuyingbao.app.dto.VoiceTextParseResponse;
import com.yuyingbao.app.dto.VoiceTextParseRequest;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.HashMap;

/**
 * AI 文本解析服务
 * v0.7 新增
 * 用于解析语音识别的文本，提取关键字段
 */
@Service
public class AiParseService {
    
    // 记录类型关键词映射
    private static final Map<String, String> RECORD_TYPE_KEYWORDS = new HashMap<String, String>() {{
        put("母乳", "BREASTFEEDING");
        put("亲喂", "BREASTFEEDING");
        put("母乳喂养", "BREASTFEEDING");
        put("瓶喂", "BOTTLE");
        put("奶瓶", "BOTTLE");
        put("配方奶", "FORMULA");
        put("奶粉", "FORMULA");
        put("辅食", "SOLID");
        put("米糊", "SOLID");
        put("蔬菜泥", "SOLID");
        put("水果泥", "SOLID");
        put("喂水", "WATER");
        put("喝水", "WATER");
        put("营养素", "NUTRITION");
        put("营养", "NUTRITION");
    }};
    
    // 营养素关键词映射
    private static final Map<String, String> NUTRITION_KEYWORDS = new HashMap<String, String>() {{
        put("AD", "AD");
        put("D3", "D3");
        put("钙", "CALCIUM");
        put("DHA", "DHA");
        put("锌", "ZINC");
        put("铁", "IRON");
        put("益生菌", "PROBIOTIC");
        put("其他", "OTHER");
    }};
    
    // 单位映射
    private static final Map<String, String> UNIT_MAP = new HashMap<String, String>() {{
        put("毫升", "ml");
        put("ML", "ml");
        put("ml", "ml");
        put("分钟", "min");
        put("分", "min");
        put("克", "g");
        put("G", "g");
    }};
    
    // 方向关键词
    private static final Map<String, String> SIDE_KEYWORDS = new HashMap<String, String>() {{
        put("左", "LEFT");
        put("左侧", "LEFT");
        put("右侧", "RIGHT");
        put("右", "RIGHT");
    }};
    
    /**
     * 解析语音文本
     */
    public VoiceTextParseResponse parseVoiceText(VoiceTextParseRequest request) {
        String text = request.getText().toLowerCase();
        String hint = request.getRecordTypeHint();
        
        // 1. 识别记录类型
        String recordType = identifyRecordType(text, hint);
        
        // 2. 提取字段
        Map<String, Object> extractedFields = extractFields(text, recordType);
        
        // 3. 计算置信度
        double confidence = calculateConfidence(text, recordType, extractedFields);
        
        // 4. 生成建议
        String suggestion = generateSuggestion(recordType, extractedFields);
        
        return VoiceTextParseResponse.builder()
                .recordType(recordType)
                .confidence(confidence)
                .needsConfirmation(confidence < 0.7)
                .extractedFields(extractedFields)
                .originalText(request.getText())
                .suggestion(suggestion)
                .build();
    }
    
    /**
     * 识别记录类型
     */
    private String identifyRecordType(String text, String hint) {
        if (hint != null && !hint.isEmpty()) {
            return hint;
        }
        
        // 遍历关键词，找到匹配的记录类型
        for (Map.Entry<String, String> entry : RECORD_TYPE_KEYWORDS.entrySet()) {
            if (text.contains(entry.getKey().toLowerCase())) {
                return entry.getValue();
            }
        }
        
        // 如果没有明确匹配，返回空字符串
        return "";
    }
    
    /**
     * 提取字段
     */
    private Map<String, Object> extractFields(String text, String recordType) {
        Map<String, Object> fields = new HashMap<>();
        
        // 提取数字（奶量、时长等）
        Pattern numberPattern = Pattern.compile("(\\d+\\.?\\d*)");
        Matcher matcher = numberPattern.matcher(text);
        List<String> numbers = new ArrayList<>();
        while (matcher.find()) {
            numbers.add(matcher.group());
        }
        
        // 提取单位
        String unit = extractUnit(text);
        
        switch (recordType) {
            case "BREASTFEEDING":
                // 母乳喂养：提取时长、方向
                if (numbers.size() > 0 && text.contains("分钟") || text.contains("分")) {
                    fields.put("duration", Double.parseDouble(numbers.get(0)));
                }
                if (text.contains("左")) {
                    fields.put("side", "LEFT");
                } else if (text.contains("右")) {
                    fields.put("side", "RIGHT");
                }
                break;
                
            case "BOTTLE":
            case "FORMULA":
            case "WATER":
                // 瓶喂/配方奶/水：提取奶量
                if (numbers.size() > 0) {
                    fields.put("amount", Double.parseDouble(numbers.get(0)));
                    if (unit != null) {
                        fields.put("unit", unit);
                    }
                }
                break;
                
            case "SOLID":
                // 辅食：提取分量
                if (numbers.size() > 0) {
                    fields.put("amount", Double.parseDouble(numbers.get(0)));
                    if (unit != null) {
                        fields.put("unit", unit);
                    }
                }
                // 提取辅食类型
                for (Map.Entry<String, String> entry : RECORD_TYPE_KEYWORDS.entrySet()) {
                    if (text.contains(entry.getKey().toLowerCase()) && entry.getValue().equals("SOLID")) {
                        fields.put("solidType", entry.getKey());
                        break;
                    }
                }
                break;
                
            case "NUTRITION":
                // 营养素：提取类型
                List<String> nutritionTypes = new ArrayList<>();
                for (Map.Entry<String, String> entry : NUTRITION_KEYWORDS.entrySet()) {
                    if (text.contains(entry.getKey().toLowerCase())) {
                        nutritionTypes.add(entry.getValue());
                    }
                }
                if (!nutritionTypes.isEmpty()) {
                    fields.put("nutritionTypes", String.join(",", nutritionTypes));
                }
                break;
        }
        
        return fields;
    }
    
    /**
     * 提取单位
     */
    private String extractUnit(String text) {
        for (Map.Entry<String, String> entry : UNIT_MAP.entrySet()) {
            if (text.contains(entry.getKey().toLowerCase())) {
                return entry.getValue();
            }
        }
        return null;
    }
    
    /**
     * 计算置信度
     */
    private double calculateConfidence(String text, String recordType, Map<String, Object> fields) {
        double confidence = 0.5; // 基础置信度
        
        // 如果成功识别记录类型，增加置信度
        if (!recordType.isEmpty()) {
            confidence += 0.3;
        }
        
        // 如果成功提取了字段，增加置信度
        if (!fields.isEmpty()) {
            confidence += 0.15;
        }
        
        // 如果有数字，增加置信度
        if (text.matches(".*\\d+.*")) {
            confidence += 0.05;
        }
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * 生成建议
     */
    private String generateSuggestion(String recordType, Map<String, Object> fields) {
        StringBuilder sb = new StringBuilder();
        
        if ("BREASTFEEDING".equals(recordType)) {
            sb.append("识别为母乳喂养");
            if (fields.containsKey("duration")) {
                sb.append("，时长 ").append(fields.get("duration")).append(" 分钟");
            }
            if (fields.containsKey("side")) {
                sb.append("，").append(fields.get("side")).append("侧");
            }
        } else if ("BOTTLE".equals(recordType) || "FORMULA".equals(recordType)) {
            sb.append("识别为").append("BOTTLE".equals(recordType) ? "瓶喂" : "配方奶");
            if (fields.containsKey("amount")) {
                sb.append("，奶量 ").append(fields.get("amount")).append(" 毫升");
            }
        } else if ("WATER".equals(recordType)) {
            sb.append("识别为喂水");
            if (fields.containsKey("amount")) {
                sb.append("，水量 ").append(fields.get("amount")).append(" 毫升");
            }
        } else if ("SOLID".equals(recordType)) {
            sb.append("识别为辅食记录");
            if (fields.containsKey("amount")) {
                sb.append("，分量 ").append(fields.get("amount"));
                if (fields.containsKey("unit")) {
                    sb.append(" ").append(fields.get("unit"));
                }
            }
        } else if ("NUTRITION".equals(recordType)) {
            sb.append("识别为营养素记录");
            if (fields.containsKey("nutritionTypes")) {
                sb.append("，类型：").append(fields.get("nutritionTypes"));
            }
        }
        
        sb.append("，请确认");
        
        return sb.toString();
    }
}

