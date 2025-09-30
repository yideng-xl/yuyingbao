package com.yuyingbao.app.controller;

import com.yuyingbao.app.config.SecurityUtils;
import com.yuyingbao.app.dto.CreateRecordRequest;
import com.yuyingbao.app.dto.UpdateRecordRequest;
import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.RecordType;
import com.yuyingbao.app.service.BabyService;
import com.yuyingbao.app.service.PermissionService;
import com.yuyingbao.app.service.RecordService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/babies/{babyId}/records")
public class BabyRecordController {
	private final RecordService recordService;
	private final BabyService babyService;
	private final PermissionService permissionService;

	public BabyRecordController(RecordService recordService, BabyService babyService, PermissionService permissionService) {
		this.recordService = recordService;
		this.babyService = babyService;
		this.permissionService = permissionService;
	}

	/**
	 * 为指定宝宝创建记录
	 * @param babyId 宝宝ID
	 * @param req 记录创建请求
	 * @return 创建的记录
	 */
	@PostMapping
	public ResponseEntity<Record> create(
			@PathVariable("babyId") Long babyId,
			@Validated @RequestBody CreateRecordRequest req
	) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证权限：用户是否有访问该宝宝的权限
		permissionService.validateBabyAccess(userId, babyId);
		
		// 验证宝宝存在并获取其家庭信息
		var baby = babyService.getBabyById(babyId);
		
		// 确保设置babyId到请求中（覆盖任何现有值）
		req.setBabyId(babyId);
		
		return ResponseEntity.ok(recordService.createRecord(baby.getFamilyId(), userId, req));
	}

	/**
	 * 获取指定宝宝的记录列表
	 * @param babyId 宝宝ID
	 * @return 记录列表
	 */
	@GetMapping
	public ResponseEntity<List<Record>> list(@PathVariable("babyId") Long babyId) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证权限：用户是否有访问该宝宝的权限
		permissionService.validateBabyAccess(userId, babyId);
		
		// 验证宝宝存在
		babyService.getBabyById(babyId);
		
		return ResponseEntity.ok(recordService.listRecordsByBabyId(babyId, null, null, null));
	}

	/**
	 * 按条件筛选指定宝宝的记录
	 * @param babyId 宝宝ID
	 * @param start 开始时间
	 * @param end 结束时间
	 * @param type 记录类型
	 * @return 筛选后的记录列表
	 */
	@GetMapping("/filter")
	public ResponseEntity<List<Record>> listWithFilter(
			@PathVariable("babyId") Long babyId,
			@RequestParam(value = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
			@RequestParam(value = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end,
			@RequestParam(value = "type", required = false) RecordType type
	) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证权限：用户是否有访问该宝宝的权限
		permissionService.validateBabyAccess(userId, babyId);
		
		// 验证宝宝存在
		babyService.getBabyById(babyId);
		
		return ResponseEntity.ok(recordService.listRecordsByBabyId(babyId, start, end, type));
	}

	/**
	 * 更新指定宝宝的记录
	 * @param babyId 宝宝ID
	 * @param recordId 记录ID
	 * @param req 更新请求
	 * @return 更新后的记录
	 */
	@PutMapping("/{recordId}")
	public ResponseEntity<Record> update(
			@PathVariable("babyId") Long babyId,
			@PathVariable("recordId") Long recordId,
			@Validated @RequestBody UpdateRecordRequest req
	) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证权限：用户是否有访问该宝宝的权限
		permissionService.validateBabyAccess(userId, babyId);
		
		// 验证宝宝存在并获取其家庭信息
		var baby = babyService.getBabyById(babyId);
		
		// 验证记录属于该宝宝
		Record existingRecord = recordService.getRecordById(recordId);
		if (!existingRecord.getBabyId().equals(babyId)) {
			throw new RuntimeException("Record does not belong to the specified baby");
		}
		
		Record updatedRecord = recordService.updateRecord(baby.getFamilyId(), recordId, userId, req);
		return ResponseEntity.ok(updatedRecord);
	}

	/**
	 * 删除指定宝宝的记录
	 * @param babyId 宝宝ID
	 * @param recordId 记录ID
	 * @return 无内容响应
	 */
	@DeleteMapping("/{recordId}")
	public ResponseEntity<Void> delete(
			@PathVariable("babyId") Long babyId,
			@PathVariable("recordId") Long recordId
	) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证权限：用户是否有访问该宝宝的权限
		permissionService.validateBabyAccess(userId, babyId);
		
		// 验证宝宝存在并获取其家庭信息
		var baby = babyService.getBabyById(babyId);
		
		// 验证记录属于该宝宝
		Record existingRecord = recordService.getRecordById(recordId);
		if (!existingRecord.getBabyId().equals(babyId)) {
			throw new RuntimeException("Record does not belong to the specified baby");
		}
		
		recordService.deleteRecord(baby.getFamilyId(), recordId, userId);
		return ResponseEntity.noContent().build();
	}
}