package com.yuyingbao.app.service;

import com.yuyingbao.app.dto.UpsertBabyRequest;
import com.yuyingbao.app.model.entity.Baby;
import com.yuyingbao.app.repository.BabyRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class BabyService {
	private final BabyRepository babyRepository;

	public BabyService(BabyRepository babyRepository) {
		this.babyRepository = babyRepository;
	}

	public Baby createBaby(Long familyId, UpsertBabyRequest req) {
		Baby baby = Baby.builder()
				.familyId(familyId)
				.name(req.getName())
				.gender(req.getGender())
				.birthDate(req.getBirthDate())
				.avatarUrl(req.getAvatarUrl())
				.birthHeightCm(req.getBirthHeightCm())
				.birthWeightKg(req.getBirthWeightKg())
				.createdAt(OffsetDateTime.now())
				.build();
		return babyRepository.save(baby);
	}

	public List<Baby> listBabies(Long familyId) {
		return babyRepository.findByFamilyId(familyId);
	}

	public Baby updateBaby(Long familyId, Long babyId, UpsertBabyRequest req) {
		Baby baby = babyRepository.findByIdAndFamilyId(babyId, familyId)
				.orElseThrow(() -> new IllegalArgumentException("宝宝不存在"));
		
		baby.setName(req.getName());
		baby.setGender(req.getGender());
		baby.setBirthDate(req.getBirthDate());
		baby.setAvatarUrl(req.getAvatarUrl());
		baby.setBirthHeightCm(req.getBirthHeightCm());
		baby.setBirthWeightKg(req.getBirthWeightKg());
		
		return babyRepository.save(baby);
	}
}
