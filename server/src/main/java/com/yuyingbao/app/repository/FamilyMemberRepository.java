package com.yuyingbao.app.repository;

import com.yuyingbao.app.model.entity.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {
	List<FamilyMember> findByFamilyId(Long familyId);
	Optional<FamilyMember> findByFamilyIdAndUserId(Long familyId, Long userId);
}
