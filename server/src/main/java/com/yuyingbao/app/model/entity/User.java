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

	@Column(nullable = false)
	private OffsetDateTime createdAt;
}
