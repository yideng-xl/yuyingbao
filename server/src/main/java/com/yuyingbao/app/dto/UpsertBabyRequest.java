package com.yuyingbao.app.dto;

import com.yuyingbao.app.model.enums.Gender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpsertBabyRequest {
	@NotBlank
	private String name;
	@NotNull
	private Gender gender;
	@NotNull
	private LocalDate birthDate;
	private String avatarUrl;
	private Double birthHeightCm;
	private Double birthWeightKg;
}


