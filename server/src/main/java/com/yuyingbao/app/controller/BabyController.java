package com.yuyingbao.app.controller;

import com.yuyingbao.app.dto.UpsertBabyRequest;
import com.yuyingbao.app.model.entity.Baby;
import com.yuyingbao.app.service.BabyService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/families/{familyId}/babies")
public class BabyController {
	private final BabyService babyService;

	public BabyController(BabyService babyService) {
		this.babyService = babyService;
	}

	@PostMapping
	public ResponseEntity<Baby> create(@PathVariable("familyId") Long familyId, @Validated @RequestBody UpsertBabyRequest req) {
		return ResponseEntity.ok(babyService.createBaby(familyId, req));
	}

	@GetMapping
	public ResponseEntity<List<Baby>> list(@PathVariable("familyId") Long familyId) {
		return ResponseEntity.ok(babyService.listBabies(familyId));
	}

	@PutMapping("/{babyId}")
	public ResponseEntity<Baby> update(@PathVariable("familyId") Long familyId, @PathVariable("babyId") Long babyId, @Validated @RequestBody UpsertBabyRequest req) {
		return ResponseEntity.ok(babyService.updateBaby(familyId, babyId, req));
	}
}
