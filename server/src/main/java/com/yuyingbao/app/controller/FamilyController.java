package com.yuyingbao.app.controller;

import com.yuyingbao.app.config.SecurityUtils;
import com.yuyingbao.app.dto.CreateFamilyRequest;
import com.yuyingbao.app.dto.FamilyDTO;
import com.yuyingbao.app.dto.FamilyMemberDTO;
import com.yuyingbao.app.dto.JoinFamilyRequest;
import com.yuyingbao.app.dto.UpdateFamilyMemberRoleRequest;
import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.model.entity.User;
import com.yuyingbao.app.model.enums.FamilyMemberRole;
import com.yuyingbao.app.service.FamilyService;
import com.yuyingbao.app.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/families")
public class FamilyController {
	private final FamilyService familyService;
	private final UserService userService;

	public FamilyController(FamilyService familyService, UserService userService) {
		this.familyService = familyService;
		this.userService = userService;
	}

	@PostMapping
	public ResponseEntity<Family> create(@Validated @RequestBody CreateFamilyRequest req) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		return ResponseEntity.ok(familyService.createFamily(userId));
	}

	@PostMapping("/join")
	public ResponseEntity<Family> join(@Validated @RequestBody JoinFamilyRequest req) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		return ResponseEntity.ok(familyService.joinFamily(userId, req.getInviteCode()));
	}

	@GetMapping("/validate-invite-code/{inviteCode}")
	public ResponseEntity<FamilyDTO> validateInviteCode(@PathVariable("inviteCode") String inviteCode) {
		Family family = familyService.getFamilyByInviteCode(inviteCode);
		List<FamilyMember> members = familyService.listMembers(family.getId());
		User creator = userService.getUserById(family.getCreatorUserId());
		FamilyDTO familyDTO = FamilyDTO.fromEntity(family, members, creator, userService);
		return ResponseEntity.ok(familyDTO);
	}

	@GetMapping("/my")
	public ResponseEntity<List<FamilyDTO>> getMyFamilies() {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		List<FamilyMember> familyMembers = familyService.listFamilyMembersByUserId(userId);
		List<FamilyDTO> familyDTOs = familyMembers.stream()
				.map(familyMember -> {
					Family family = familyService.getFamilyById(familyMember.getFamilyId());
					List<FamilyMember> members = familyService.listMembers(family.getId());
					User creator = userService.getUserById(family.getCreatorUserId());
					return FamilyDTO.fromEntity(family, members, creator, userService);
				})
				.collect(Collectors.toList());
		return ResponseEntity.ok(familyDTOs);
	}

	@GetMapping("/{familyId}")
	public ResponseEntity<FamilyDTO> getFamily(@PathVariable("familyId") Long familyId) {
		Family family = familyService.getFamilyById(familyId);
		List<FamilyMember> members = familyService.listMembers(familyId);
		User creator = userService.getUserById(family.getCreatorUserId());
		FamilyDTO familyDTO = FamilyDTO.fromEntity(family, members, creator, userService);
		return ResponseEntity.ok(familyDTO);
	}

	@GetMapping("/{familyId}/members")
	public ResponseEntity<List<FamilyMemberDTO>> members(@PathVariable("familyId") Long familyId) {
		List<FamilyMember> members = familyService.listMembers(familyId);
		List<FamilyMemberDTO> memberDTOs = members.stream()
				.map(member -> {
					User user = userService.getUserById(member.getUserId());
					return FamilyMemberDTO.fromEntity(member, user);
				})
				.collect(Collectors.toList());
		return ResponseEntity.ok(memberDTOs);
	}

	@PutMapping("/{familyId}/members/{memberId}/role")
	public ResponseEntity<FamilyMemberDTO> updateMemberRole(
			@PathVariable("familyId") Long familyId,
			@PathVariable("memberId") Long memberId,
			@Validated @RequestBody UpdateFamilyMemberRoleRequest request) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		// 验证当前用户是否有权限更新成员角色（必须是家庭创建者）
		FamilyMember currentUserMember = familyService.listMembers(familyId).stream()
				.filter(member -> member.getUserId().equals(userId) && "CREATOR".equals(member.getRole()))
				.findFirst()
				.orElseThrow(() -> new IllegalArgumentException("只有家庭创建者可以更新成员角色"));

		FamilyMember updatedMember = familyService.updateMemberRole(familyId, memberId, request.getMemberRole());
		User user = userService.getUserById(updatedMember.getUserId());
		return ResponseEntity.ok(FamilyMemberDTO.fromEntity(updatedMember, user));
	}

	@PostMapping("/check-name")
	public ResponseEntity<Boolean> checkFamilyNameExists(@RequestBody Map<String, String> request) {
		String name = request.get("name");
		if (name == null || name.trim().isEmpty()) {
			return ResponseEntity.badRequest().build();
		}
		boolean exists = familyService.checkFamilyNameExists(name.trim());
		return ResponseEntity.ok(exists);
	}
}