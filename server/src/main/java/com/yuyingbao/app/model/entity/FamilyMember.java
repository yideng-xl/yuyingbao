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
@Table(name = "family_members")
public class FamilyMember {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private Long familyId;

	@Column(nullable = false)
	private Long userId;

	@Column(nullable = false, length = 16)
	private String role; // CREATOR or MEMBER

	@Column(nullable = false)
	private OffsetDateTime joinedAt;
}
