package com.yuyingbao.app.model.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.yuyingbao.app.model.enums.*;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "records")
public class Record {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private Long familyId;

	@Column(nullable = false)
	private Long userId; // who created it

	@Column(nullable = false)
	private Long babyId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32)
	private RecordType type;

	// Common fields
	@Column(nullable = false)
	@JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
	private OffsetDateTime happenedAt;

	@Column(length = 255)
	private String note;

	// Feeding fields
	@Column
	private Double amountMl; // bottle/formula/expressed milk ml

	@Column
	private Integer durationMin; // breastfeeding duration

	@Column(length = 16)
	private String breastfeedingSide; // LEFT/RIGHT/BOTH

	@Enumerated(EnumType.STRING)
	@Column(length = 32)
	private SolidType solidType;

	// 新增：辅食增强字段
	@Column(length = 1000)
	private String solidIngredients; // 多种食材信息

	@Column(length = 100)
	private String solidBrand; // 食材品牌

	@Column(length = 100)
	private String solidOrigin; // 食材产地

	// Diaper fields
	@Enumerated(EnumType.STRING)
	@Column(length = 16)
	private DiaperTexture diaperTexture;

	@Enumerated(EnumType.STRING)
	@Column(length = 16)
	private DiaperColor diaperColor;

	@Column
	private Boolean hasUrine;

	// Growth fields
	@Column
	private Double heightCm;

	@Column
	private Double weightKg;
}