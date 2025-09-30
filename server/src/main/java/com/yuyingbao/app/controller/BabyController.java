package com.yuyingbao.app.controller;

import com.yuyingbao.app.dto.UpsertBabyRequest;
import com.yuyingbao.app.model.entity.Baby;
import com.yuyingbao.app.service.BabyService;
import com.yuyingbao.app.service.PermissionService;
import com.yuyingbao.app.config.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/families/{familyId}/babies")
public class BabyController {
	private final BabyService babyService;
	private final PermissionService permissionService;

	public BabyController(BabyService babyService, PermissionService permissionService) {
		this.babyService = babyService;
		this.permissionService = permissionService;
	}

	@PostMapping
	public ResponseEntity<Baby> create(@PathVariable("familyId") Long familyId, @Validated @RequestBody UpsertBabyRequest req) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证用户是否有访问该家庭的权限
		permissionService.validateFamilyAccess(userId, familyId);
		
		return ResponseEntity.ok(babyService.createBaby(familyId, req));
	}

	@GetMapping
	public ResponseEntity<List<Baby>> list(@PathVariable("familyId") Long familyId) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证用户是否有访问该家庭的权限
		permissionService.validateFamilyAccess(userId, familyId);
		
		return ResponseEntity.ok(babyService.listBabies(familyId));
	}

	@PostMapping("/batch")
	public ResponseEntity<List<Baby>> batchGet(@PathVariable("familyId") Long familyId, @RequestBody List<Long> babyIds) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证用户是否有访问该家庭的权限
		permissionService.validateFamilyAccess(userId, familyId);
		
		return ResponseEntity.ok(babyService.listBabiesByIds(babyIds));
	}

	@PutMapping("/{babyId}")
	public ResponseEntity<Baby> update(@PathVariable("familyId") Long familyId, @PathVariable("babyId") Long babyId, @Validated @RequestBody UpsertBabyRequest req) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证用户是否有访问该家庭的权限
		permissionService.validateFamilyAccess(userId, familyId);
		
		return ResponseEntity.ok(babyService.updateBaby(familyId, babyId, req));
	}

	@GetMapping("/{babyId}")
	public ResponseEntity<Baby> get(@PathVariable("familyId") Long familyId, @PathVariable("babyId") Long babyId) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证用户是否有访问该家庭的权限
		permissionService.validateFamilyAccess(userId, familyId);
		
		Baby baby = babyService.getBabyById(babyId);
		// 简单校验宝宝是否属于指定家庭
		if (!baby.getFamilyId().equals(familyId)) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok(baby);
	}

	@DeleteMapping("/{babyId}")
	public ResponseEntity<Void> delete(@PathVariable("familyId") Long familyId, @PathVariable("babyId") Long babyId) {
		Long userId = SecurityUtils.getCurrentUserIdOrThrow();
		
		// 验证用户是否有访问该家庭的权限
		permissionService.validateFamilyAccess(userId, familyId);
		
		babyService.deleteBaby(familyId, babyId);
		return ResponseEntity.ok().build();
	}
}
