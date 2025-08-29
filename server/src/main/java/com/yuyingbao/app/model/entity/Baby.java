package com.yuyingbao.app.model.entity;

import com.yuyingbao.app.model.enums.Gender;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "babies")
public class Baby {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private Long familyId;

	@Column(nullable = false, length = 100)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private Gender gender;

	@Column(nullable = false)
	private LocalDate birthDate;

	@Column(length = 255)
	private String avatarUrl;

	@Column
	private Double birthHeightCm;

	@Column
	private Double birthWeightKg;

	@Column(nullable = false)
	private OffsetDateTime createdAt;
}
