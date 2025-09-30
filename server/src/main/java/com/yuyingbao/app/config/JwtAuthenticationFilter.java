package com.yuyingbao.app.config;

import com.yuyingbao.app.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
	private final JwtService jwtService;

	public JwtAuthenticationFilter(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
		String authHeader = request.getHeader("Authorization");
		System.out.println("JWT Filter - Authorization Header: " + authHeader);
		
		if (authHeader != null && authHeader.startsWith("Bearer ")) {
			String token = authHeader.substring(7);
			System.out.println("JWT Filter - Token: " + token);
			
			try {
				Claims claims = jwtService.parseToken(token);
				System.out.println("JWT Filter - Claims: " + claims);
				
				String subject = claims.getSubject();
				User principal = new User(subject, "", Collections.emptyList());
				UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
				authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
				SecurityContextHolder.getContext().setAuthentication(authentication);
			} catch (Exception e) {
				System.out.println("JWT Filter - Token parsing failed: " + e.getMessage());
				SecurityContextHolder.clearContext();
			}
		} else {
			System.out.println("JWT Filter - No valid Bearer token found");
		}
		
		filterChain.doFilter(request, response);
	}
}