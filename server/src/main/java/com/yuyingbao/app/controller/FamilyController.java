package com.yuyingbao.app.controller;

import com.yuyingbao.app.config.SecurityUtils;
import com.yuyingbao.app.dto.CreateFamilyRequest;
import com.yuyingbao.app.dto.JoinFamilyRequest;
import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.service.FamilyService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/families")
public class FamilyController {
	private final FamilyService familyService;

	public FamilyController(FamilyService familyService) {
		this.familyService = familyService;
	}

	@PostMapping
	public ResponseEntity<Family> create(@Validated @RequestBody CreateFamilyRequest req) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		return ResponseEntity.ok(familyService.createFamily(userId, req.getName()));
	}

	@PostMapping("/join")
	public ResponseEntity<Family> join(@Validated @RequestBody JoinFamilyRequest req) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		return ResponseEntity.ok(familyService.joinFamily(userId, req.getInviteCode()));
	}

	@GetMapping("/{familyId}/members")
	public ResponseEntity<List<FamilyMember>> members(@PathVariable("familyId") Long familyId) {
		return ResponseEntity.ok(familyService.listMembers(familyId));
	}
}
