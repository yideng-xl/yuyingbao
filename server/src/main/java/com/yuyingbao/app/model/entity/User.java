package com.yuyingbao.app.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 64)
	private String openId;

	@Column(nullable = false, length = 64)
	private String nickname;

	@Column(length = 255)
	private String avatarUrl;

	// 设备ID（用于追踪用户设备）
	@Column(length = 128)
	private String deviceId;

	// 设备品牌
	@Column(length = 64)
	private String deviceBrand;

	// 设备型号
	@Column(length = 64)
	private String deviceModel;

	// 系统版本
	@Column(length = 64)
	private String systemVersion;

	// 微信版本
	@Column(length = 64)
	private String wechatVersion;

	@Column(nullable = false)
	private OffsetDateTime createdAt;

	@Column
	private OffsetDateTime lastLoginAt; // 最后登录时间
}
