package com.yuyingbao.app.controller;

import com.yuyingbao.app.service.PermissionService;
import com.yuyingbao.app.service.StatisticsService;
import com.yuyingbao.app.config.SecurityUtils;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;
    private final PermissionService permissionService;

    public StatisticsController(StatisticsService statisticsService, PermissionService permissionService) {
        this.statisticsService = statisticsService;
        this.permissionService = permissionService;
    }

    /**
     * 获取宝宝今日统计数据
     * @param babyId 宝宝ID
     * @return 统计数据
     */
    @GetMapping("/babies/{babyId}/today")
    public ResponseEntity<Map<String, Object>> getBabyTodayStatistics(@PathVariable Long babyId) {
        Long userId = SecurityUtils.getCurrentUserIdOrThrow();
        
        // 验证用户是否有访问该宝宝数据的权限
        permissionService.validateBabyAccess(userId, babyId);
        
        Map<String, Object> statistics = statisticsService.getTodayStatistics(babyId);
        return ResponseEntity.ok(statistics);
    }

    /**
     * 获取宝宝指定时间范围的统计数据
     * @param babyId 宝宝ID
     * @param startDate 开始时间
     * @param endDate 结束时间
     * @return 统计数据
     */
    @GetMapping("/babies/{babyId}")
    public ResponseEntity<Map<String, Object>> getBabyStatistics(
            @PathVariable Long babyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate) {
        Long userId = SecurityUtils.getCurrentUserIdOrThrow();
        
        // 验证用户是否有访问该宝宝数据的权限
        permissionService.validateBabyAccess(userId, babyId);
        
        Map<String, Object> statistics = statisticsService.getStatistics(babyId, startDate, endDate);
        return ResponseEntity.ok(statistics);
    }

    /**
     * 获取家庭今日统计数据
     * @param familyId 家庭ID
     * @return 统计数据
     */
    @GetMapping("/families/{familyId}/today")
    public ResponseEntity<Map<String, Object>> getFamilyTodayStatistics(@PathVariable Long familyId) {
        Long userId = SecurityUtils.getCurrentUserIdOrThrow();
        
        // 验证用户是否属于该家庭
        permissionService.validateFamilyAccess(userId, familyId);
        
        Map<String, Object> statistics = statisticsService.getFamilyTodayStatistics(familyId);
        return ResponseEntity.ok(statistics);
    }

    /**
     * 获取宝宝成长趋势数据
     * @param babyId 宝宝ID
     * @param days 天数，默认30天
     * @return 趋势数据
     */
    @GetMapping("/babies/{babyId}/growth-trend")
    public ResponseEntity<Map<String, Object>> getBabyGrowthTrend(
            @PathVariable Long babyId,
            @RequestParam(defaultValue = "30") int days) {
        Long userId = SecurityUtils.getCurrentUserIdOrThrow();
        
        // 验证用户是否有访问该宝宝数据的权限
        permissionService.validateBabyAccess(userId, babyId);
        
        Map<String, Object> trend = statisticsService.getGrowthTrend(babyId, days);
        return ResponseEntity.ok(trend);
    }

    /**
     * 兼容原有接口：获取今日统计（支持babyId参数）
     * @param babyId 宝宝ID（可选）
     * @return 统计数据
     */
    @GetMapping("/today")
    public ResponseEntity<Map<String, Object>> getTodayStatistics(@RequestParam(required = false) Long babyId) {
        if (babyId != null) {
            Long userId = SecurityUtils.getCurrentUserIdOrThrow();
            
            // 验证用户是否有访问该宝宝数据的权限
            permissionService.validateBabyAccess(userId, babyId);
            
            Map<String, Object> statistics = statisticsService.getTodayStatistics(babyId);
            return ResponseEntity.ok(statistics);
        } else {
            // 如果没有指定babyId，返回错误
            return ResponseEntity.badRequest().body(Map.of("error", "Baby ID is required"));
        }
    }

    /**
     * 兼容原有接口：获取趋势数据
     * @param babyId 宝宝ID（可选）
     * @param type 趋势类型
     * @param days 天数
     * @return 趋势数据
     */
    @GetMapping("/trend")
    public ResponseEntity<Map<String, Object>> getTrend(
            @RequestParam(required = false) Long babyId,
            @RequestParam String type,
            @RequestParam(defaultValue = "30") int days) {
        if (babyId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Baby ID is required"));
        }
        
        Long userId = SecurityUtils.getCurrentUserIdOrThrow();
        
        // 验证用户是否有访问该宝宝数据的权限
        permissionService.validateBabyAccess(userId, babyId);
        
        if ("weight".equals(type) || "height".equals(type)) {
            Map<String, Object> trend = statisticsService.getGrowthTrend(babyId, days);
            return ResponseEntity.ok(trend);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported trend type"));
        }
    }
}