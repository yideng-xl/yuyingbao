package com.yuyingbao.app.service;

import com.yuyingbao.app.dto.WeChatLoginRequest;
import com.yuyingbao.app.model.entity.User;
import com.yuyingbao.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {
	private final UserRepository userRepository;
	private final JwtService jwtService;

	public AuthService(UserRepository userRepository, JwtService jwtService) {
		this.userRepository = userRepository;
		this.jwtService = jwtService;
	}

	public String loginWithWeChat(String code, String nickname, String avatarUrl) {
		// TODO: Exchange code with WeChat server to get openId, here we mock it
		String openId = "mock-" + code;
		
		User user = userRepository.findByOpenId(openId).orElseGet(() -> {
			User u = User.builder()
					.openId(openId)
					.nickname(StringUtils.hasText(nickname) ? nickname : "用户")
					.avatarUrl(avatarUrl)
					.createdAt(OffsetDateTime.now())
					.build();
			return userRepository.save(u);
		});

		// 更新用户信息（如果提供了新的信息）
		boolean needUpdate = false;
		if (StringUtils.hasText(nickname) && !nickname.equals(user.getNickname())) {
			user.setNickname(nickname);
			needUpdate = true;
		}
		if (StringUtils.hasText(avatarUrl) && !avatarUrl.equals(user.getAvatarUrl())) {
			user.setAvatarUrl(avatarUrl);
			needUpdate = true;
		}
		
		if (needUpdate) {
			user = userRepository.save(user);
		}

		Map<String, Object> claims = new HashMap<>();
		claims.put("nickname", user.getNickname());
		claims.put("openId", user.getOpenId());
		return jwtService.generateToken(user.getId(), claims);
	}
	
	/**
	 * 完整的微信登录处理
	 */
	public Map<String, Object> loginWithWeChatComplete(WeChatLoginRequest request) {
		// TODO: 调用微信API获取openId和sessionKey
		String openId = "mock-" + request.getCode();
		
		// 查找或创建用户
		User user = userRepository.findByOpenId(openId)
				.map(existingUser -> updateUserInfo(existingUser, request))
				.orElseGet(() -> createNewUser(openId, request));
		
		// 生成JWT Token
		Map<String, Object> claims = new HashMap<>();
		claims.put("nickname", user.getNickname());
		claims.put("openId", user.getOpenId());
		
		String token = jwtService.generateToken(user.getId(), claims);
		
		// 返回登录结果
		Map<String, Object> result = new HashMap<>();
		result.put("token", token);
		result.put("tokenType", "Bearer");
		result.put("userInfo", Map.of(
			"id", user.getId(),
			"nickname", user.getNickname(),
			"avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
			"openId", user.getOpenId()
		));
		
		return result;
	}
	
	private User createNewUser(String openId, WeChatLoginRequest request) {
		User user = User.builder()
				.openId(openId)
				.nickname(StringUtils.hasText(request.getNickname()) ? request.getNickname() : "用户")
				.avatarUrl(request.getAvatarUrl())
				.createdAt(OffsetDateTime.now())
				.build();
		return userRepository.save(user);
	}
	
	private User updateUserInfo(User user, WeChatLoginRequest request) {
		boolean needUpdate = false;
		
		if (StringUtils.hasText(request.getNickname()) && 
			!request.getNickname().equals(user.getNickname())) {
			user.setNickname(request.getNickname());
			needUpdate = true;
		}
		
		if (StringUtils.hasText(request.getAvatarUrl()) && 
			!request.getAvatarUrl().equals(user.getAvatarUrl())) {
			user.setAvatarUrl(request.getAvatarUrl());
			needUpdate = true;
		}
		
		return needUpdate ? userRepository.save(user) : user;
	}
}
