package com.yuyingbao.app.service;

import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.repository.FamilyMemberRepository;
import com.yuyingbao.app.repository.FamilyRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;

@Service
public class FamilyService {
	private final FamilyRepository familyRepository;
	private final FamilyMemberRepository familyMemberRepository;

	public FamilyService(FamilyRepository familyRepository, FamilyMemberRepository familyMemberRepository) {
		this.familyRepository = familyRepository;
		this.familyMemberRepository = familyMemberRepository;
	}

	public Family createFamily(Long creatorUserId, String name) {
		Family family = Family.builder()
				.name(name)
				.inviteCode(generateInviteCode())
				.creatorUserId(creatorUserId)
				.createdAt(OffsetDateTime.now())
				.build();
		family = familyRepository.save(family);
		FamilyMember fm = FamilyMember.builder()
				.familyId(family.getId())
				.userId(creatorUserId)
				.role("CREATOR")
				.joinedAt(OffsetDateTime.now())
				.build();
		familyMemberRepository.save(fm);
		return family;
	}

	public Family joinFamily(Long userId, String inviteCode) {
		Family family = familyRepository.findByInviteCode(inviteCode)
				.orElseThrow(() -> new IllegalArgumentException("无效的邀请码"));
		familyMemberRepository.findByFamilyIdAndUserId(family.getId(), userId).ifPresent(fm -> {
			throw new IllegalArgumentException("已加入该家庭");
		});
		FamilyMember fm = FamilyMember.builder()
				.familyId(family.getId())
				.userId(userId)
				.role("MEMBER")
				.joinedAt(OffsetDateTime.now())
				.build();
		familyMemberRepository.save(fm);
		return family;
	}

	public List<FamilyMember> listMembers(Long familyId) {
		return familyMemberRepository.findByFamilyId(familyId);
	}

	private String generateInviteCode() {
		byte[] bytes = new byte[4];
		new SecureRandom().nextBytes(bytes);
		return HexFormat.of().withUpperCase().formatHex(bytes);
	}
}
