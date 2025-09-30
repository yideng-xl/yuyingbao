package com.yuyingbao.app.repository;

import com.yuyingbao.app.model.entity.Family;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FamilyRepository extends JpaRepository<Family, Long> {
	Optional<Family> findByInviteCode(String inviteCode);
	Optional<Family> findByName(String name);
}