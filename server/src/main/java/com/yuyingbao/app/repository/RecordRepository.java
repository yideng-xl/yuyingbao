package com.yuyingbao.app.repository;

import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.RecordType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Long> {
	// 原有的基于familyId的查询方法（保留兼容性）
	List<Record> findByFamilyIdAndHappenedAtBetween(Long familyId, OffsetDateTime start, OffsetDateTime end);
	List<Record> findByFamilyIdAndTypeAndHappenedAtBetween(Long familyId, RecordType type, OffsetDateTime start, OffsetDateTime end);
	List<Record> findByFamilyId(Long familyId);
	
	@Query("SELECT r FROM Record r WHERE r.familyId = :familyId ORDER BY r.happenedAt DESC")
	List<Record> findByFamilyIdOrderByHappenedAtDesc(@Param("familyId") Long familyId);
	
	@Query("SELECT r FROM Record r WHERE r.familyId = :familyId AND r.happenedAt BETWEEN :start AND :end ORDER BY r.happenedAt DESC")
	List<Record> findByFamilyIdAndHappenedAtBetweenOrderByHappenedAtDesc(@Param("familyId") Long familyId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
	
	@Query("SELECT r FROM Record r WHERE r.familyId = :familyId AND r.type = :type AND r.happenedAt BETWEEN :start AND :end ORDER BY r.happenedAt DESC")
	List<Record> findByFamilyIdAndTypeAndHappenedAtBetweenOrderByHappenedAtDesc(@Param("familyId") Long familyId, @Param("type") RecordType type, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
	
	// 新增：基于babyId的查询方法
	List<Record> findByBabyId(Long babyId);
	
	@Query("SELECT r FROM Record r WHERE r.babyId = :babyId ORDER BY r.happenedAt DESC")
	List<Record> findByBabyIdOrderByHappenedAtDesc(@Param("babyId") Long babyId);
	
	@Query("SELECT r FROM Record r WHERE r.babyId = :babyId AND r.happenedAt BETWEEN :start AND :end ORDER BY r.happenedAt DESC")
	List<Record> findByBabyIdAndHappenedAtBetweenOrderByHappenedAtDesc(@Param("babyId") Long babyId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
	
	@Query("SELECT r FROM Record r WHERE r.babyId = :babyId AND r.type = :type AND r.happenedAt BETWEEN :start AND :end ORDER BY r.happenedAt DESC")
	List<Record> findByBabyIdAndTypeAndHappenedAtBetweenOrderByHappenedAtDesc(@Param("babyId") Long babyId, @Param("type") RecordType type, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
	
	// 新增：用于统计的查询方法
	List<Record> findByBabyIdAndHappenedAtBetween(Long babyId, OffsetDateTime start, OffsetDateTime end);
	
	@Query("SELECT r FROM Record r WHERE r.babyId = :babyId AND r.type = :type AND r.happenedAt BETWEEN :start AND :end ORDER BY r.happenedAt ASC")
	List<Record> findByBabyIdAndTypeAndHappenedAtBetweenOrderByHappenedAtAsc(@Param("babyId") Long babyId, @Param("type") RecordType type, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
}
