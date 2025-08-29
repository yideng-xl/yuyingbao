package com.yuyingbao.app.service;

import com.yuyingbao.app.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
	private final JwtConfig jwtConfig;
	private final Key key;

	public JwtService(JwtConfig jwtConfig) {
		this.jwtConfig = jwtConfig;
		this.key = Keys.hmacShaKeyFor(jwtConfig.getSecret().getBytes());
	}

	public String generateToken(Long userId, Map<String, Object> claims) {
		OffsetDateTime now = OffsetDateTime.now();
		OffsetDateTime expiry = now.plusMinutes(jwtConfig.getExpirationMinutes());
		return Jwts.builder()
				.setClaims(claims)
				.setSubject(String.valueOf(userId))
				.setIssuer(jwtConfig.getIssuer())
				.setIssuedAt(Date.from(now.toInstant()))
				.setExpiration(Date.from(expiry.toInstant()))
				.signWith(key, SignatureAlgorithm.HS256)
				.compact();
	}

	public Claims parseToken(String token) {
		return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
	}
}
