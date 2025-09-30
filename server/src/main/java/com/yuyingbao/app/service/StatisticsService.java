package com.yuyingbao.app.service;

import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.RecordType;
import com.yuyingbao.app.repository.RecordRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatisticsService {

    private final RecordRepository recordRepository;

    public StatisticsService(RecordRepository recordRepository) {
        this.recordRepository = recordRepository;
    }

    /**
     * 获取宝宝今日统计数据
     * @param babyId 宝宝ID
     * @return 统计数据
     */
    public Map<String, Object> getTodayStatistics(Long babyId) {
        // 获取今天的开始和结束时间
        OffsetDateTime startOfDay = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime();
        OffsetDateTime endOfDay = startOfDay.plusDays(1);

        // 查询今天的记录
        List<Record> todayRecords = recordRepository.findByBabyIdAndHappenedAtBetween(
                babyId, startOfDay, endOfDay);

        return calculateStatistics(todayRecords);
    }

    /**
     * 获取宝宝指定日期范围的统计数据
     * @param babyId 宝宝ID
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @return 统计数据
     */
    public Map<String, Object> getStatistics(Long babyId, OffsetDateTime startDate, OffsetDateTime endDate) {
        List<Record> records = recordRepository.findByBabyIdAndHappenedAtBetween(
                babyId, startDate, endDate);

        return calculateStatistics(records);
    }

    /**
     * 获取家庭今日统计数据（所有宝宝合计）
     * @param familyId 家庭ID
     * @return 统计数据
     */
    public Map<String, Object> getFamilyTodayStatistics(Long familyId) {
        // 获取今天的开始和结束时间
        OffsetDateTime startOfDay = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime();
        OffsetDateTime endOfDay = startOfDay.plusDays(1);

        // 查询今天的记录
        List<Record> todayRecords = recordRepository.findByFamilyIdAndHappenedAtBetween(
                familyId, startOfDay, endOfDay);

        return calculateStatistics(todayRecords);
    }

    /**
     * 计算统计数据
     * @param records 记录列表
     * @return 统计结果
     */
    private Map<String, Object> calculateStatistics(List<Record> records) {
        Map<String, Object> statistics = new HashMap<>();
        
        // 喂养统计
        Map<String, Object> feedingStats = new HashMap<>();
        int breastfeedingCount = 0;
        int breastfeedingDuration = 0;
        int bottleCount = 0;
        double bottleAmount = 0.0;
        int formulaCount = 0;
        double formulaAmount = 0.0;
        int solidCount = 0;
        int waterCount = 0;
        double waterAmount = 0.0;
        
        // 其他统计
        int diaperCount = 0;
        int growthCount = 0;
        
        // 总喂养量（ml）- 母乳按10ml/分钟估算
        double totalFeedingAmount = 0.0;
        int totalFeedingCount = 0;

        for (Record record : records) {
            switch (record.getType()) {
                case BREASTFEEDING:
                    breastfeedingCount++;
                    totalFeedingCount++;
                    if (record.getDurationMin() != null) {
                        breastfeedingDuration += record.getDurationMin();
                        // 母乳按10ml/分钟估算
                        totalFeedingAmount += record.getDurationMin() * 10;
                    }
                    break;
                case BOTTLE:
                    bottleCount++;
                    totalFeedingCount++;
                    if (record.getAmountMl() != null) {
                        bottleAmount += record.getAmountMl();
                        totalFeedingAmount += record.getAmountMl();
                    }
                    break;
                case FORMULA:
                    formulaCount++;
                    totalFeedingCount++;
                    if (record.getAmountMl() != null) {
                        formulaAmount += record.getAmountMl();
                        totalFeedingAmount += record.getAmountMl();
                    }
                    break;
                case SOLID:
                    solidCount++;
                    totalFeedingCount++;
                    break;
                case WATER:
                    waterCount++;
                    if (record.getAmountMl() != null) {
                        waterAmount += record.getAmountMl();
                    }
                    break;
                case DIAPER:
                    diaperCount++;
                    break;
                case GROWTH:
                    growthCount++;
                    break;
            }
        }

        // 构建喂养统计
        feedingStats.put("breastfeeding", Map.of(
                "count", breastfeedingCount,
                "totalDuration", breastfeedingDuration
        ));
        feedingStats.put("bottle", Map.of(
                "count", bottleCount,
                "totalAmount", bottleAmount
        ));
        feedingStats.put("formula", Map.of(
                "count", formulaCount,
                "totalAmount", formulaAmount
        ));
        feedingStats.put("solid", Map.of(
                "count", solidCount
        ));
        feedingStats.put("water", Map.of(
                "count", waterCount,
                "totalAmount", waterAmount
        ));
        feedingStats.put("total", Map.of(
                "count", totalFeedingCount,
                "amount", totalFeedingAmount
        ));

        statistics.put("feeding", feedingStats);
        statistics.put("diaper", Map.of("count", diaperCount));
        statistics.put("growth", Map.of("count", growthCount));
        
        // 添加建议
        List<String> suggestions = generateSuggestions(totalFeedingAmount, totalFeedingCount, diaperCount);
        statistics.put("suggestions", suggestions);

        return statistics;
    }

    /**
     * 生成喂养建议
     * @param totalAmount 总喂养量
     * @param feedingCount 喂养次数
     * @param diaperCount 大便次数
     * @return 建议列表
     */
    private List<String> generateSuggestions(double totalAmount, int feedingCount, int diaperCount) {
        List<String> suggestions = List.of();
        
        // 这里可以根据宝宝年龄、体重等因素生成个性化建议
        // 目前提供基础建议
        if (totalAmount < 400) {
            suggestions = List.of("今日喂养量偏少，建议适当增加喂奶次数");
        } else if (totalAmount > 1000) {
            suggestions = List.of("今日喂养量充足，继续保持良好的喂养习惯");
        } else {
            suggestions = List.of("今日喂养量在正常范围内，宝宝发育良好");
        }

        return suggestions;
    }

    /**
     * 获取宝宝成长趋势数据
     * @param babyId 宝宝ID
     * @param days 天数
     * @return 趋势数据
     */
    public Map<String, Object> getGrowthTrend(Long babyId, int days) {
        OffsetDateTime endDate = OffsetDateTime.now();
        OffsetDateTime startDate = endDate.minusDays(days);

        List<Record> growthRecords = recordRepository.findByBabyIdAndTypeAndHappenedAtBetweenOrderByHappenedAtAsc(
                babyId, RecordType.GROWTH, startDate, endDate);

        Map<String, Object> trend = new HashMap<>();
        trend.put("babyId", babyId);
        trend.put("days", days);
        trend.put("records", growthRecords);

        return trend;
    }
}