package com.yuyingbao.app.repository;

import com.yuyingbao.app.model.entity.Baby;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BabyRepository extends JpaRepository<Baby, Long> {
	List<Baby> findByFamilyId(Long familyId);
	Optional<Baby> findByIdAndFamilyId(Long id, Long familyId);
	List<Baby> findByIdIn(List<Long> ids);
}
