package com.yuyingbao.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateFamilyRequest {
	@NotBlank
	private String name;
}


