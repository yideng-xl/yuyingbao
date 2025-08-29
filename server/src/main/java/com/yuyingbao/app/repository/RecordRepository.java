package com.yuyingbao.app.repository;

import com.yuyingbao.app.model.entity.Record;
import com.yuyingbao.app.model.enums.RecordType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface RecordRepository extends JpaRepository<Record, Long> {
	List<Record> findByFamilyIdAndHappenedAtBetween(Long familyId, OffsetDateTime start, OffsetDateTime end);
	List<Record> findByFamilyIdAndTypeAndHappenedAtBetween(Long familyId, RecordType type, OffsetDateTime start, OffsetDateTime end);
	List<Record> findByFamilyId(Long familyId);
	
	// 添加排序的查询方法
	@Query("SELECT r FROM Record r WHERE r.familyId = :familyId ORDER BY r.happenedAt DESC")
	List<Record> findByFamilyIdOrderByHappenedAtDesc(@Param("familyId") Long familyId);
	
	@Query("SELECT r FROM Record r WHERE r.familyId = :familyId AND r.happenedAt BETWEEN :start AND :end ORDER BY r.happenedAt DESC")
	List<Record> findByFamilyIdAndHappenedAtBetweenOrderByHappenedAtDesc(@Param("familyId") Long familyId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
	
	@Query("SELECT r FROM Record r WHERE r.familyId = :familyId AND r.type = :type AND r.happenedAt BETWEEN :start AND :end ORDER BY r.happenedAt DESC")
	List<Record> findByFamilyIdAndTypeAndHappenedAtBetweenOrderByHappenedAtDesc(@Param("familyId") Long familyId, @Param("type") RecordType type, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
}
