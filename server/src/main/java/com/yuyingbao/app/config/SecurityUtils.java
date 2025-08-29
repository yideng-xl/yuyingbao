package com.yuyingbao.app.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {
	public static Long getCurrentUserIdOrThrow() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || authentication.getName() == null) {
			throw new IllegalStateException("Unauthenticated");
		}
		return Long.parseLong(authentication.getName());
	}
}
