package com.yuyingbao.app.controller;

import com.yuyingbao.app.dto.WeChatLoginRequest;
import com.yuyingbao.app.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	/**
	 * 微信登录（简化版，兼容原有接口）
	 */
	@PostMapping("/wechat/login")
	public ResponseEntity<Map<String, Object>> wechatLogin(@Validated @RequestBody WeChatLoginRequest request) {
		String token = authService.loginWithWeChat(request.getCode(), request.getNickname(), request.getAvatarUrl());
		Map<String, Object> resp = new HashMap<>();
		resp.put("token", token);
		resp.put("tokenType", "Bearer");
		return ResponseEntity.ok(resp);
	}
	
	/**
	 * 微信登录（完整版，返回用户信息）
	 */
	@PostMapping("/wechat/login-complete")
	public ResponseEntity<Map<String, Object>> wechatLoginComplete(@Validated @RequestBody WeChatLoginRequest request) {
		Map<String, Object> result = authService.loginWithWeChatComplete(request);
		return ResponseEntity.ok(result);
	}
}
