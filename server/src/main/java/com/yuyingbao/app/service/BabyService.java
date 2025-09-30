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

	public List<Baby> listBabiesByIds(List<Long> babyIds) {
		return babyRepository.findByIdIn(babyIds);
	}

	/**
	 * 根据ID获取宝宝信息
	 * @param babyId 宝宝ID
	 * @return 宝宝信息
	 * @throws RuntimeException 如果宝宝不存在
	 */
	public Baby getBabyById(Long babyId) {
		return babyRepository.findById(babyId)
				.orElseThrow(() -> new RuntimeException("Baby not found with id: " + babyId));
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

	/**
	 * 删除宝宝
	 * @param familyId 家庭ID
	 * @param babyId 宝宝ID
	 * @throws IllegalArgumentException 如果宝宝不存在或不属于指定家庭
	 */
	public void deleteBaby(Long familyId, Long babyId) {
		Baby baby = babyRepository.findByIdAndFamilyId(babyId, familyId)
				.orElseThrow(() -> new IllegalArgumentException("宝宝不存在或无权限删除"));
		
		babyRepository.delete(baby);
	}
}
