package com.yuyingbao.app.controller;

import com.yuyingbao.app.config.SecurityUtils;
import com.yuyingbao.app.dto.CreateRecordRequest;
import com.yuyingbao.app.dto.UpdateRecordRequest;
import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.RecordType;
import com.yuyingbao.app.service.RecordService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/families/{familyId}/records")
public class RecordController {
	private final RecordService recordService;

	public RecordController(RecordService recordService) {
		this.recordService = recordService;
	}

	@PostMapping
	public ResponseEntity<Record> create(
			@PathVariable("familyId") Long familyId,
			@Validated @RequestBody CreateRecordRequest req
	) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		return ResponseEntity.ok(recordService.createRecord(familyId, userId, req));
	}

	@GetMapping
	public ResponseEntity<List<Record>> list(@PathVariable("familyId") Long familyId) {
		return ResponseEntity.ok(recordService.listRecords(familyId, null, null, null));
	}

	@GetMapping("/filter")
	public ResponseEntity<List<Record>> listWithFilter(
			@PathVariable("familyId") Long familyId,
			@RequestParam(value = "start", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
			@RequestParam(value = "end", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end,
			@RequestParam(value = "type", required = false) RecordType type
	) {
		return ResponseEntity.ok(recordService.listRecords(familyId, start, end, type));
	}

	@GetMapping("/test")
	public ResponseEntity<String> test(@PathVariable("familyId") Long familyId) {
		return ResponseEntity.ok("Records endpoint working for family: " + familyId);
	}

	/**
	 * 更新记录
	 * @param familyId 家庭ID
	 * @param recordId 记录ID
	 * @param req 更新请求
	 * @return 更新后的记录
	 */
	@PutMapping("/{recordId}")
	public ResponseEntity<Record> update(
			@PathVariable("familyId") Long familyId,
			@PathVariable("recordId") Long recordId,
			@Validated @RequestBody UpdateRecordRequest req
	) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		Record updatedRecord = recordService.updateRecord(familyId, recordId, userId, req);
		return ResponseEntity.ok(updatedRecord);
	}

	/**
	 * 删除记录
	 * @param familyId 家庭ID
	 * @param recordId 记录ID
	 * @return 无内容响应
	 */
	@DeleteMapping("/{recordId}")
	public ResponseEntity<Void> delete(
			@PathVariable("familyId") Long familyId,
			@PathVariable("recordId") Long recordId
	) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		recordService.deleteRecord(familyId, recordId, userId);
		return ResponseEntity.noContent().build();
	}
}
