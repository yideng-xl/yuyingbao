package com.yuyingbao.app.service;

import com.yuyingbao.app.dto.CreateRecordRequest;
import com.yuyingbao.app.dto.UpdateRecordRequest;
import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.RecordType;
import com.yuyingbao.app.repository.RecordRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class RecordService {
	private final RecordRepository recordRepository;

	public RecordService(RecordRepository recordRepository) {
		this.recordRepository = recordRepository;
	}

	public Record createRecord(Long familyId, Long userId, CreateRecordRequest req) {
		Record record = Record.builder()
				.familyId(familyId)
				.userId(userId)
				.babyId(req.getBabyId())
				.type(req.getType())
				.happenedAt(req.getHappenedAt())
				.note(req.getNote())
				.amountMl(req.getAmountMl())
				.durationMin(req.getDurationMin())
				.breastfeedingSide(req.getBreastfeedingSide())
				.solidType(req.getSolidType())
				// 新增：辅食增强字段
				.solidIngredients(req.getSolidIngredients())
				.solidBrand(req.getSolidBrand())
				.solidOrigin(req.getSolidOrigin())
				.diaperTexture(req.getDiaperTexture())
				.diaperColor(req.getDiaperColor())
				.hasUrine(req.getHasUrine())
				.heightCm(req.getHeightCm())
				.weightKg(req.getWeightKg())
				.build();
		return recordRepository.save(record);
	}

	public List<Record> listRecords(Long familyId, OffsetDateTime start, OffsetDateTime end, RecordType type) {
		try {
			if (start != null && end != null && type != null) {
				return recordRepository.findByFamilyIdAndTypeAndHappenedAtBetweenOrderByHappenedAtDesc(familyId, type, start, end);
			}
			if (start != null && end != null) {
				return recordRepository.findByFamilyIdAndHappenedAtBetweenOrderByHappenedAtDesc(familyId, start, end);
			}
			return recordRepository.findByFamilyIdOrderByHappenedAtDesc(familyId);
		} catch (Exception e) {
			// Log the error and return empty list for now
			System.err.println("Error fetching records: " + e.getMessage());
			return new ArrayList<>();
		}
	}

	/**
	 * 基于babyId查询记录列表
	 * @param babyId 宝宝ID
	 * @param start 开始时间
	 * @param end 结束时间
	 * @param type 记录类型
	 * @return 记录列表
	 */
	public List<Record> listRecordsByBabyId(Long babyId, OffsetDateTime start, OffsetDateTime end, RecordType type) {
		try {
			if (start != null && end != null && type != null) {
				return recordRepository.findByBabyIdAndTypeAndHappenedAtBetweenOrderByHappenedAtDesc(babyId, type, start, end);
			}
			if (start != null && end != null) {
				return recordRepository.findByBabyIdAndHappenedAtBetweenOrderByHappenedAtDesc(babyId, start, end);
			}
			return recordRepository.findByBabyIdOrderByHappenedAtDesc(babyId);
		} catch (Exception e) {
			// Log the error and return empty list for now
			System.err.println("Error fetching records by babyId: " + e.getMessage());
			return new ArrayList<>();
		}
	}

	/**
	 * 根据ID获取记录
	 * @param recordId 记录ID
	 * @return 记录
	 * @throws RuntimeException 如果记录不存在
	 */
	public Record getRecordById(Long recordId) {
		return recordRepository.findById(recordId)
				.orElseThrow(() -> new RuntimeException("Record not found with id: " + recordId));
	}

	/**
	 * 更新记录
	 * @param familyId 家庭ID
	 * @param recordId 记录ID
	 * @param userId 当前用户ID
	 * @param req 更新请求
	 * @return 更新后的记录
	 * @throws RuntimeException 如果记录不存在或用户无权限
	 */
	public Record updateRecord(Long familyId, Long recordId, Long userId, UpdateRecordRequest req) {
		// 查找记录并验证权限
		Optional<Record> existingRecordOpt = recordRepository.findById(recordId);
		if (existingRecordOpt.isEmpty()) {
			throw new RuntimeException("Record not found with id: " + recordId);
		}
		
		Record existingRecord = existingRecordOpt.get();
		
		// 验证记录属于指定的家庭
		if (!existingRecord.getFamilyId().equals(familyId)) {
			throw new RuntimeException("Record does not belong to the specified family");
		}
		
		// 更新记录字段
		existingRecord.setType(req.getType());
		existingRecord.setHappenedAt(req.getHappenedAt());
		existingRecord.setNote(req.getNote());
		existingRecord.setAmountMl(req.getAmountMl());
		existingRecord.setDurationMin(req.getDurationMin());
		existingRecord.setBreastfeedingSide(req.getBreastfeedingSide());
		existingRecord.setSolidType(req.getSolidType());
		// 新增：辅食增强字段
		existingRecord.setSolidIngredients(req.getSolidIngredients());
		existingRecord.setSolidBrand(req.getSolidBrand());
		existingRecord.setSolidOrigin(req.getSolidOrigin());
		existingRecord.setDiaperTexture(req.getDiaperTexture());
		existingRecord.setDiaperColor(req.getDiaperColor());
		existingRecord.setHasUrine(req.getHasUrine());
		existingRecord.setHeightCm(req.getHeightCm());
		existingRecord.setWeightKg(req.getWeightKg());
		
		return recordRepository.save(existingRecord);
	}

	/**
	 * 删除记录
	 * @param familyId 家庭ID
	 * @param recordId 记录ID
	 * @param userId 当前用户ID
	 * @throws RuntimeException 如果记录不存在或用户无权限
	 */
	public void deleteRecord(Long familyId, Long recordId, Long userId) {
		// 查找记录并验证权限
		Optional<Record> existingRecordOpt = recordRepository.findById(recordId);
		if (existingRecordOpt.isEmpty()) {
			throw new RuntimeException("Record not found with id: " + recordId);
		}
		
		Record existingRecord = existingRecordOpt.get();
		
		// 验证记录属于指定的家庭
		if (!existingRecord.getFamilyId().equals(familyId)) {
			throw new RuntimeException("Record does not belong to the specified family");
		}
		
		// 删除记录
		recordRepository.deleteById(recordId);
	}
}