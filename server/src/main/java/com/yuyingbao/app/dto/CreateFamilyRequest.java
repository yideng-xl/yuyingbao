package com.yuyingbao.app.dto;

import lombok.Data;

@Data
public class CreateFamilyRequest {
	// 家庭名称将自动生成，无需用户提供
	private String name;
}