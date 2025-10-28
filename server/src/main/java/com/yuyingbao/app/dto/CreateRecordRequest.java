package com.yuyingbao.app.dto;

import com.yuyingbao.app.model.enums.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class CreateRecordRequest {
	// babyId 在新的 API 中通过路径参数提供，不再需要 @NotNull 验证
	private Long babyId;
	@NotNull
	private RecordType type;
	@NotNull
	private OffsetDateTime happenedAt;
	private String note;
	private Double amountMl;
	private Integer durationMin;
	private String breastfeedingSide;
	private SolidType solidType;
	// 新增：辅食增强字段
	private String solidIngredients; // 多种食材信息
	private String solidBrand; // 食材品牌
	private String solidOrigin; // 食材产地
	private DiaperTexture diaperTexture;
	private DiaperColor diaperColor;
	private Boolean hasUrine;
	private Double heightCm;
	private Double weightKg;
	private String nutritionTypes; // 营养素类型，用逗号分隔
}