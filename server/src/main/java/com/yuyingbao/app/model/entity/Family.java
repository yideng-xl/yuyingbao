package com.yuyingbao.app.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "families")
public class Family {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(nullable = false, length = 12)
	private String inviteCode;

	@Column(nullable = false)
	private Long creatorUserId;

	@Column(nullable = false)
	private OffsetDateTime createdAt;
}
